import React from 'react';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

interface FirebaseErrorScreenProps {
  error: Error | null;
  isDevelopment: boolean;
}

export function FirebaseErrorScreen({ error, isDevelopment }: FirebaseErrorScreenProps) {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Card className="max-w-2xl w-full shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            Configuration Error
          </CardTitle>
          <CardDescription className="text-base">
            The Smart Attendance System needs to be configured before it can be used.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Details */}
          {error && isDevelopment && (
            <Alert variant="destructive">
              <AlertDescription className="font-mono text-sm">
                {error.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions for Deployment Platform */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-2xl">🔧</span>
              Setup Required
            </h3>
            
            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <p className="font-medium">
                This application requires your Firebase API key to be configured.
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-3">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200">
                  Quick Setup (1 minute):
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-300">
                  <li>Open the file: <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded font-mono text-xs">/src/config/firebase.ts</code></li>
                  <li>Find line 13 with: <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded font-mono text-xs">apiKey: ""</code></li>
                  <li>Add your Firebase API key between the quotes</li>
                  <li>Save the file - the app will reload automatically!</li>
                </ol>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-green-900 dark:text-green-200">
                  Where to find your Firebase API key?
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-green-800 dark:text-green-300">
                  <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline">Firebase Console</a></li>
                  <li>Open project: <strong>athgo-5b01d</strong></li>
                  <li>Click the ⚙️ gear icon → Project settings</li>
                  <li>Scroll to "Your apps" section</li>
                  <li>Copy the <code className="bg-white dark:bg-green-800 px-1 rounded">apiKey</code> value</li>
                </ol>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                <p className="text-xs text-yellow-800 dark:text-yellow-300">
                  💡 <strong>Tip:</strong> All other Firebase settings are already configured. You only need to add the API key!
                </p>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <Alert>
            <AlertDescription className="text-xs">
              <strong>🔒 Security Note:</strong> Never commit environment variables to Git. 
              Always configure them in your deployment platform's dashboard.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              onClick={handleRefresh} 
              className="flex-1"
              size="lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Connection
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open('https://console.firebase.google.com', '_blank')}
              size="lg"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Firebase Console
            </Button>
          </div>

          {/* Support */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Smart Attendance System - Bharati Vidyapeeth University
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Need help? Contact your system administrator
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}