import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600">User engagement and system metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>Advanced analytics features</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Advanced analytics and reporting features will be available in the next phase.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}