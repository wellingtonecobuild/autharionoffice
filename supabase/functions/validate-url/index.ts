import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize URL - add https:// if missing
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    console.log(`Validating URL: ${normalizedUrl}`);

    // Validate URL format
    try {
      new URL(normalizedUrl);
    } catch {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid URL format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache first
    const { data: cachedResult } = await supabase
      .from('url_validation_cache')
      .select('*')
      .eq('url', normalizedUrl)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedResult) {
      console.log(`Cache hit for URL: ${normalizedUrl}, valid: ${cachedResult.is_valid}`);
      return new Response(
        JSON.stringify({
          valid: cachedResult.is_valid,
          normalizedUrl,
          statusCode: cachedResult.status_code,
          error: cachedResult.error_message,
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Cache miss for URL: ${normalizedUrl}, performing validation...`);

    // Try to fetch the URL with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    let isValid = false;
    let statusCode: number | null = null;
    let errorMessage: string | null = null;

    try {
      const response = await fetch(normalizedUrl, {
        method: 'HEAD', // Use HEAD request for faster validation
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; URLValidator/1.0)',
        },
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      // Accept 2xx and 3xx status codes as valid
      isValid = response.status >= 200 && response.status < 400;
      statusCode = response.status;
      
      if (!isValid) {
        errorMessage = `Website returned status ${response.status}`;
      }
      
      console.log(`URL validation result: ${normalizedUrl} - status: ${response.status}, valid: ${isValid}`);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // If HEAD request fails, try GET request (some servers don't support HEAD)
      try {
        const getController = new AbortController();
        const getTimeoutId = setTimeout(() => getController.abort(), 10000);

        const getResponse = await fetch(normalizedUrl, {
          method: 'GET',
          signal: getController.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; URLValidator/1.0)',
          },
          redirect: 'follow',
        });

        clearTimeout(getTimeoutId);

        isValid = getResponse.status >= 200 && getResponse.status < 400;
        statusCode = getResponse.status;
        
        if (!isValid) {
          errorMessage = `Website returned status ${getResponse.status}`;
        }
        
        console.log(`URL validation (GET fallback): ${normalizedUrl} - status: ${getResponse.status}, valid: ${isValid}`);
      } catch (getError) {
        const errMsg = getError instanceof Error ? getError.message : 'Unknown error';
        
        // Check for specific error types
        if (errMsg.includes('abort')) {
          console.log(`URL validation timeout: ${normalizedUrl}`);
          errorMessage = 'Website took too long to respond';
        } else {
          console.log(`URL validation failed: ${normalizedUrl} - ${errMsg}`);
          errorMessage = 'Website is not accessible';
        }
        
        isValid = false;
      }
    }

    // Cache the result (upsert to handle race conditions)
    const { error: cacheError } = await supabase
      .from('url_validation_cache')
      .upsert({
        url: normalizedUrl,
        is_valid: isValid,
        status_code: statusCode,
        error_message: errorMessage,
        validated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }, { onConflict: 'url' });

    if (cacheError) {
      console.error('Failed to cache URL validation result:', cacheError);
    } else {
      console.log(`Cached URL validation result: ${normalizedUrl}, valid: ${isValid}`);
    }

    // Return the result
    if (isValid) {
      return new Response(
        JSON.stringify({ 
          valid: true, 
          normalizedUrl,
          statusCode,
          cached: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: errorMessage,
          statusCode,
          cached: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('URL validation error:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Validation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
