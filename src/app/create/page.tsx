// src/app/create/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function CreatePredictionPage() {
  const router = useRouter();

  useEffect(() => {
    toast.error('Prediction creation is restricted to platform administrators');
    router.push('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center py-8">
      <Card className="max-w-md w-full mx-4">
        <CardHeader>
          <CardTitle className="text-center">Access Restricted</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-6">
            Only platform administrators can create predictions. 
            This ensures quality control and verifiable outcomes.
          </p>
          <Button onClick={() => router.push('/')}>
            Return to Homepage
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
