import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  Bell,
  Shield,
  Database,
  Mail,
  Key,
  Globe,
  Loader2,
} from "lucide-react";

export default function AdminSettings() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    toast({ title: "Settings saved successfully" });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-settings-title">Settings</h1>
          <p className="text-muted-foreground">Configure application settings and integrations</p>
        </div>

        <div className="grid gap-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <CardTitle>General Settings</CardTitle>
              </div>
              <CardDescription>Basic application configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="app-name">Application Name</Label>
                <Input id="app-name" defaultValue="FamVoy" data-testid="input-app-name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="support-email">Support Email</Label>
                <Input id="support-email" type="email" placeholder="support@famvoy.com" data-testid="input-support-email" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">Temporarily disable the app for users</p>
                </div>
                <Switch data-testid="switch-maintenance" />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <CardTitle>Notifications</CardTitle>
              </div>
              <CardDescription>Configure notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Send email notifications for new bookings</p>
                </div>
                <Switch defaultChecked data-testid="switch-email-notifications" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Admin Alerts</Label>
                  <p className="text-sm text-muted-foreground">Receive alerts for critical events</p>
                </div>
                <Switch defaultChecked data-testid="switch-admin-alerts" />
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <CardTitle>Security</CardTitle>
              </div>
              <CardDescription>Security and access control settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p>
                </div>
                <Switch data-testid="switch-2fa" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Session Timeout</Label>
                  <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
                </div>
                <Input type="number" defaultValue="60" className="w-20" data-testid="input-session-timeout" />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            </CardContent>
          </Card>

          {/* Integrations */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                <CardTitle>Integrations</CardTitle>
              </div>
              <CardDescription>API keys and third-party integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Stripe Integration</Label>
                <div className="flex items-center gap-2">
                  <Input type="password" defaultValue="••••••••••••" disabled className="flex-1" />
                  <Badge variant="outline" className="bg-green-100 text-green-700">Connected</Badge>
                </div>
              </div>
              <Separator />
              <div className="grid gap-2">
                <Label>Google Maps API</Label>
                <div className="flex items-center gap-2">
                  <Input type="password" defaultValue="••••••••••••" disabled className="flex-1" />
                  <Badge variant="outline" className="bg-green-100 text-green-700">Connected</Badge>
                </div>
              </div>
              <Separator />
              <div className="grid gap-2">
                <Label>OpenAI API</Label>
                <div className="flex items-center gap-2">
                  <Input type="password" defaultValue="••••••••••••" disabled className="flex-1" />
                  <Badge variant="outline" className="bg-green-100 text-green-700">Connected</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} data-testid="button-save-settings">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function Badge({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) {
  return (
    <span className={`px-2 py-1 text-xs rounded-full ${className}`}>
      {children}
    </span>
  );
}
