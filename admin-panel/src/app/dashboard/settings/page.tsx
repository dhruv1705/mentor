import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">System configuration and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>Configure system-wide preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              System configuration features will be available in the next phase.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>TTS Configuration</CardTitle>
            <CardDescription>Global text-to-speech settings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              TTS configuration panel will be available in the next phase.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}