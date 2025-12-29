// src/components/admin/ResolveManager.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase/config';
import { httpsCallable } from 'firebase/functions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface Prediction {
  id: string;
  question: string;
  description?: string;
  status: string;
  totalVotes: number;
  endTime: { toDate: () => Date } | null;
  options: Array<{ id: string; label: string; votes: number }>;
}

export default function ResolveManager() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [explanation, setExplanation] = useState('');
  const [sourceLink, setSourceLink] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'predictions'),
        where('status', 'in', ['active', 'closed']),
        orderBy('endTime', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const now = new Date();
      const preds = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Prediction))
        .filter((pred) => {
          const endTime = pred.endTime?.toDate();
          return endTime && endTime <= now;
        });
      
      setPredictions(preds);
    } catch (error) {
      console.error('Error loading predictions:', error);
      toast.error('Failed to load predictions');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedPrediction || !selectedOption) {
      toast.error('Please select a winning option');
      return;
    }

    if (!confirm('Are you sure you want to resolve this prediction? This action cannot be easily undone.')) {
      return;
    }

    try {
      setResolving(true);
      const resolvePrediction = httpsCallable(functions, 'resolvePrediction');
      const result = await resolvePrediction({
        predictionId: selectedPrediction.id,
        winningOptionId: selectedOption,
        explanation,
        sourceLink,
      });

      const data = result.data as { success: boolean; correctCount: number; incorrectCount: number };
      toast.success(
        `Prediction resolved! ${data.correctCount} correct, ${data.incorrectCount} incorrect votes`
      );
      
      setSelectedPrediction(null);
      setSelectedOption('');
      setExplanation('');
      setSourceLink('');
      loadPredictions();
    } catch (error) {
      console.error('Error resolving prediction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to resolve prediction';
      toast.error(errorMessage);
    } finally {
      setResolving(false);
    }
  };

  const openResolveModal = (prediction: Prediction) => {
    setSelectedPrediction(prediction);
    setSelectedOption('');
    setExplanation('');
    setSourceLink('');
  };

  if (loading) {
    return <div className="text-center py-12">Loading predictions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Resolve Predictions</h2>
        <Button onClick={loadPredictions} variant="outline">
          Refresh
        </Button>
      </div>

      {predictions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="mx-auto text-green-600 mb-4" size={48} />
            <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
            <p className="text-gray-600">No predictions awaiting resolution</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-yellow-600" size={24} />
                <div>
                  <h3 className="font-semibold text-yellow-900">
                    {predictions.length} prediction{predictions.length !== 1 ? 's' : ''} need resolution
                  </h3>
                  <p className="text-sm text-yellow-700">
                    These predictions have ended and are waiting for the correct outcome
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {predictions.map((prediction) => (
              <Card key={prediction.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{prediction.question}</h3>
                      {prediction.description && (
                        <p className="text-gray-600 text-sm mb-3">{prediction.description}</p>
                      )}
                      <div className="space-y-2">
                        {prediction.options.map((option) => {
                          const percentage = prediction.totalVotes > 0
                            ? ((option.votes / prediction.totalVotes) * 100).toFixed(1)
                            : '0';
                          return (
                            <div key={option.id} className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium">{option.label}</span>
                                <span className="text-gray-600">
                                  {option.votes} votes ({percentage}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-sm text-gray-500 mt-3">
                        Total votes: {prediction.totalVotes} • Ended: {prediction.endTime?.toDate().toLocaleString()}
                      </p>
                    </div>
                    <Button onClick={() => openResolveModal(prediction)} className="ml-4">
                      Resolve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Resolution Modal */}
      <Dialog open={!!selectedPrediction} onOpenChange={() => setSelectedPrediction(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Prediction</DialogTitle>
          </DialogHeader>
          
          {selectedPrediction && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">{selectedPrediction.question}</h3>
                <p className="text-sm text-gray-600">
                  Total votes: {selectedPrediction.totalVotes}
                </p>
              </div>

              <div>
                <Label>Select Winning Option *</Label>
                <div className="space-y-2 mt-2">
                  {selectedPrediction.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedOption(option.id)}
                      className={`w-full p-3 text-left border-2 rounded-lg transition-colors ${
                        selectedOption === option.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-sm text-gray-600">{option.votes} votes</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Explanation (optional)</Label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explain the outcome..."
                  className="w-full border rounded-lg p-2 min-h-[100px] mt-1"
                  maxLength={500}
                />
              </div>

              <div>
                <Label>Source Link (optional)</Label>
                <Input
                  type="url"
                  value={sourceLink}
                  onChange={(e) => setSourceLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              {selectedOption && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Preview Impact</h4>
                  <p className="text-sm text-blue-800">
                    {selectedPrediction.options.find(o => o.id === selectedOption)?.votes || 0} users will be marked correct
                  </p>
                  <p className="text-sm text-blue-800">
                    {selectedPrediction.totalVotes - (selectedPrediction.options.find(o => o.id === selectedOption)?.votes || 0)} users will be marked incorrect
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleResolve}
                  disabled={!selectedOption || resolving}
                >
                  {resolving ? 'Resolving...' : 'Confirm Resolution'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedPrediction(null)}
                  disabled={resolving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
