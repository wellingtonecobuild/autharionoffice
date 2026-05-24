import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Hammer, Palette, Truck, Leaf } from 'lucide-react';

const categories = [
  {
    id: 'eco_builders',
    name: 'Eco Builders',
    icon: Hammer,
    description: 'Certified sustainable construction companies',
    subCategories: ['New Builds', 'Renovations', 'Extensions', 'Commercial'],
  },
  {
    id: 'architects_designers',
    name: 'Architects & Designers',
    icon: Palette,
    description: 'Green architects and sustainable designers',
    subCategories: ['Residential', 'Commercial', 'Landscape', 'Interior'],
  },
  {
    id: 'sustainable_suppliers',
    name: 'Sustainable Suppliers',
    icon: Truck,
    description: 'Eco-friendly building material suppliers',
    subCategories: [
      'Timber & Framing',
      'Insulation',
      'Roofing Materials',
      'Windows & Doors',
      'Flooring',
      'Paints & Finishes',
      'Solar & Energy',
    ],
  },
  {
    id: 'renovation_specialists',
    name: 'Renovation Specialists',
    icon: Leaf,
    description: 'Eco-renovation and retrofit experts',
    subCategories: ['Energy Retrofits', 'Kitchen & Bath', 'Whole House', 'Heritage'],
  },
];

export default function AdminCategories() {
  return (
    <AdminLayout title="Categories Management">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Business Categories</CardTitle>
            <CardDescription>
              Categories are currently defined in the database enum. Contact support to add new categories.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <category.icon className="h-5 w-5" />
                  {category.name}
                </CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Sub-categories:</p>
                  <div className="flex flex-wrap gap-2">
                    {category.subCategories.map((sub) => (
                      <Badge key={sub} variant="outline">
                        {sub}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Locations */}
        <Card>
          <CardHeader>
            <CardTitle>Service Locations</CardTitle>
            <CardDescription>Wellington region coverage areas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {['Wellington City', 'Lower Hutt', 'Upper Hutt', 'Porirua', 'Kāpiti Coast'].map((location) => (
                <Badge key={location} variant="secondary">
                  {location}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
