import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Eye, EyeOff, Sparkles, Star, Search, Save, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Business {
  id: string;
  name: string;
  category: string;
  city: string;
  status: string;
  subscription_plan: string;
  is_verified: boolean;
  is_featured: boolean;
  latitude: number | null;
  longitude: number | null;
  map_visible: boolean;
  pin_priority: 'normal' | 'featured' | 'spotlight';
  address: string;
}

const categoryLabels: Record<string, string> = {
  'eco-builders': 'Eco Builder',
  'suppliers': 'Supplier',
  'architects': 'Architect',
  'renovation': 'Renovation',
};

export default function AdminMapControl() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');

  useEffect(() => {
    fetchBusinesses();
  }, []);

  async function fetchBusinesses() {
    setLoading(true);
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, category, city, status, subscription_plan, is_verified, is_featured, latitude, longitude, map_visible, pin_priority, address')
      .eq('status', 'active')
      .order('name');

    if (error) {
      toast.error('Failed to load businesses');
      console.error(error);
    } else {
      setBusinesses((data as Business[]) || []);
    }
    setLoading(false);
  }

  async function toggleMapVisibility(business: Business) {
    const { error } = await supabase
      .from('businesses')
      .update({ map_visible: !business.map_visible })
      .eq('id', business.id);

    if (error) {
      toast.error('Failed to update visibility');
    } else {
      toast.success(`${business.name} ${business.map_visible ? 'hidden from' : 'shown on'} map`);
      fetchBusinesses();
    }
  }

  async function updatePinPriority(businessId: string, priority: 'normal' | 'featured' | 'spotlight') {
    const { error } = await supabase
      .from('businesses')
      .update({ pin_priority: priority })
      .eq('id', businessId);

    if (error) {
      toast.error('Failed to update pin priority');
    } else {
      toast.success('Pin priority updated');
      fetchBusinesses();
    }
  }

  async function saveCoordinates() {
    if (!editingBusiness) return;

    const lat = parseFloat(editLat);
    const lng = parseFloat(editLng);

    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Invalid coordinates');
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Coordinates out of range');
      return;
    }

    const { error } = await supabase
      .from('businesses')
      .update({ latitude: lat, longitude: lng })
      .eq('id', editingBusiness.id);

    if (error) {
      toast.error('Failed to update coordinates');
    } else {
      toast.success('Coordinates updated');
      setEditingBusiness(null);
      fetchBusinesses();
    }
  }

  const filteredBusinesses = businesses.filter((b) => {
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         b.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || b.category === filterCategory;
    const matchesPriority = filterPriority === 'all' || b.pin_priority === filterPriority;
    return matchesSearch && matchesCategory && matchesPriority;
  });

  const stats = {
    total: businesses.length,
    visible: businesses.filter(b => b.map_visible).length,
    withCoords: businesses.filter(b => b.latitude && b.longitude).length,
    spotlight: businesses.filter(b => b.pin_priority === 'spotlight').length,
    featured: businesses.filter(b => b.pin_priority === 'featured').length,
  };

  return (
    <AdminLayout title="Map Control">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{stats.visible}</div>
            <p className="text-xs text-muted-foreground">Visible on Map</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-accent">{stats.withCoords}</div>
            <p className="text-xs text-muted-foreground">With Coordinates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-500">{stats.spotlight}</div>
            <p className="text-xs text-muted-foreground">Spotlight Pins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-500">{stats.featured}</div>
            <p className="text-xs text-muted-foreground">Featured Pins</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="eco-builders">Eco Builders</SelectItem>
                <SelectItem value="suppliers">Suppliers</SelectItem>
                <SelectItem value="architects">Architects</SelectItem>
                <SelectItem value="renovation">Renovation</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Pin Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="spotlight">Spotlight</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" asChild>
              <Link to="/map" target="_blank">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Map
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Business Table */}
      <Card>
        <CardHeader>
          <CardTitle>Business Map Settings</CardTitle>
          <CardDescription>
            Manage map visibility, pin priority, and coordinates for each business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Coordinates</TableHead>
                  <TableHead>Visible</TableHead>
                  <TableHead>Pin Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading businesses...
                    </TableCell>
                  </TableRow>
                ) : filteredBusinesses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No businesses found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBusinesses.map((business) => (
                    <TableRow key={business.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{business.name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {categoryLabels[business.category] || business.category}
                            </Badge>
                            {business.is_verified && (
                              <Badge variant="outline" className="text-xs text-accent border-accent">
                                Verified
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{business.city}</span>
                      </TableCell>
                      <TableCell>
                        {business.latitude && business.longitude ? (
                          <span className="text-xs text-muted-foreground font-mono">
                            {business.latitude.toFixed(4)}, {business.longitude.toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-xs text-destructive">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={business.map_visible}
                          onCheckedChange={() => toggleMapVisibility(business)}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={business.pin_priority}
                          onValueChange={(v) => updatePinPriority(business.id, v as 'normal' | 'featured' | 'spotlight')}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">
                              <span className="flex items-center gap-2">
                                <MapPin className="w-3 h-3" />
                                Normal
                              </span>
                            </SelectItem>
                            <SelectItem value="featured">
                              <span className="flex items-center gap-2">
                                <Star className="w-3 h-3 text-blue-500" />
                                Featured
                              </span>
                            </SelectItem>
                            <SelectItem value="spotlight">
                              <span className="flex items-center gap-2">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                Spotlight
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingBusiness(business);
                            setEditLat(business.latitude?.toString() || '');
                            setEditLng(business.longitude?.toString() || '');
                          }}
                        >
                          <MapPin className="w-4 h-4 mr-1" />
                          Edit Coords
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Coordinates Dialog */}
      <Dialog open={!!editingBusiness} onOpenChange={() => setEditingBusiness(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Coordinates</DialogTitle>
          </DialogHeader>
          {editingBusiness && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Setting coordinates for: <strong>{editingBusiness.name}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Address: {editingBusiness.address}, {editingBusiness.city}
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="-41.2865"
                    value={editLat}
                    onChange={(e) => setEditLat(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="174.7762"
                    value={editLng}
                    onChange={(e) => setEditLng(e.target.value)}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Tip: Wellington coordinates are approximately -41.2 to -41.4 (lat) and 174.7 to 175.2 (lng)
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBusiness(null)}>
              Cancel
            </Button>
            <Button onClick={saveCoordinates}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
