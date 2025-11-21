import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Search,
  Plus,
  Clock,
} from 'lucide-react';

export default function DraftsPage() {
  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Drafts</h1>
          <p className="text-muted-foreground mt-1">
            Your saved document drafts
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Draft
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search drafts..."
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved Drafts</CardTitle>
          <CardDescription>
            Documents you've started but haven't completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No drafts yet</h3>
            <p className="text-muted-foreground mb-4">
              Start creating a document in the Builder to save drafts here.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Draft
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
