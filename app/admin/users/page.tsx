import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold capitalize">users</h1>
        <p className="text-muted-foreground mt-1">
          Página em desenvolvimento
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Em Breve</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Esta funcionalidade está sendo implementada.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
