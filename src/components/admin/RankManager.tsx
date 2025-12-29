// src/components/admin/RankManager.tsx
'use client';

import { useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase/config';
import { httpsCallable } from 'firebase/functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { TrendingUp, Search, AlertCircle } from 'lucide-react';

interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  currentRank: string;
  rankPercentage: number;
  totalPredictions: number;
  correctPredictions: number;
}

const RANKS = [
  { value: 'novice', label: 'Novice', color: 'gray' },
  { value: 'amateur', label: 'Amateur', color: 'blue' },
  { value: 'analyst', label: 'Analyst', color: 'green' },
  { value: 'professional', label: 'Professional', color: 'purple' },
  { value: 'expert', label: 'Expert', color: 'orange' },
  { value: 'master', label: 'Master', color: 'red' },
];

export default function RankManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'email' | 'username' | 'id'>('email');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedRank, setSelectedRank] = useState('');
  const [reason, setReason] = useState('');
  const [promoting, setPromoting] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    try {
      setSearching(true);
      setFoundUser(null);

      let userDoc;
      
      if (searchType === 'id') {
        const docRef = doc(db, 'users', searchTerm.trim());
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          userDoc = { id: docSnap.id, ...docSnap.data() };
        }
      } else if (searchType === 'email') {
        // Search by email - try exact match first, then partial
        const searchLower = searchTerm.trim().toLowerCase();
        
        const exactQuery = query(collection(db, 'users'), where('email', '==', searchLower));
        const exactSnapshot = await getDocs(exactQuery);
        
        if (!exactSnapshot.empty) {
          userDoc = { id: exactSnapshot.docs[0].id, ...exactSnapshot.docs[0].data() };
        } else {
          // Fallback: Get all users and filter client-side for partial match
          const allUsersQuery = query(collection(db, 'users'));
          const allSnapshot = await getDocs(allUsersQuery);
          const matchingDoc = allSnapshot.docs.find(doc => {
            const email = doc.data().email?.toLowerCase() || '';
            return email.includes(searchLower);
          });
          
          if (matchingDoc) {
            userDoc = { id: matchingDoc.id, ...matchingDoc.data() };
          }
        }
      } else {
        // Search by username - partial match
        const searchLower = searchTerm.trim().toLowerCase();
        
        const exactQuery = query(collection(db, 'users'), where('displayName', '==', searchTerm.trim()));
        const exactSnapshot = await getDocs(exactQuery);
        
        if (!exactSnapshot.empty) {
          userDoc = { id: exactSnapshot.docs[0].id, ...exactSnapshot.docs[0].data() };
        } else {
          // Fallback: Get all users and filter client-side for partial match
          const allUsersQuery = query(collection(db, 'users'));
          const allSnapshot = await getDocs(allUsersQuery);
          const matchingDoc = allSnapshot.docs.find(doc => {
            const displayName = doc.data().displayName?.toLowerCase() || '';
            return displayName.includes(searchLower);
          });
          
          if (matchingDoc) {
            userDoc = { id: matchingDoc.id, ...matchingDoc.data() };
          }
        }
      }

      if (userDoc) {
        setFoundUser(userDoc as UserProfile);
        toast.success('User found');
      } else {
        toast.error('User not found');
      }
    } catch (error) {
      console.error('Error searching user:', error);
      toast.error('Failed to search user');
    } finally {
      setSearching(false);
    }
  };

  const handlePromote = async () => {
    if (!foundUser || !selectedRank || !reason.trim()) {
      toast.error('Please select a rank and provide a reason');
      return;
    }

    if (selectedRank === foundUser.currentRank) {
      toast.error('User is already at this rank');
      return;
    }

    try {
      setPromoting(true);
      const promoteUser = httpsCallable(functions, 'promoteUser');
      await promoteUser({
        userId: foundUser.id,
        newRank: selectedRank,
        reason: reason.trim(),
      });

      toast.success(`User promoted to ${selectedRank}`);
      setShowPromoteModal(false);
      setSelectedRank('');
      setReason('');
      
      // Refresh user data
      const docRef = doc(db, 'users', foundUser.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setFoundUser({ id: docSnap.id, ...docSnap.data() } as UserProfile);
      }
    } catch (error) {
      console.error('Error promoting user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to promote user';
      toast.error(errorMessage);
    } finally {
      setPromoting(false);
    }
  };

  const openPromoteModal = () => {
    setSelectedRank(foundUser?.currentRank || '');
    setReason('');
    setShowPromoteModal(true);
  };

  const currentRankIndex = RANKS.findIndex(r => r.value === foundUser?.currentRank);
  const selectedRankIndex = RANKS.findIndex(r => r.value === selectedRank);
  const isPromotion = selectedRankIndex > currentRankIndex;
  const isDemotion = selectedRankIndex < currentRankIndex;

  const accuracyRate = foundUser && foundUser.totalPredictions > 0
    ? ((foundUser.correctPredictions / foundUser.totalPredictions) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Rank Management</h2>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle>Search User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <Label>Search By</Label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as 'email' | 'username' | 'id')}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="email">Email</option>
                  <option value="username">Username</option>
                  <option value="id">User ID</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>Search Term</Label>
                <div className="flex gap-2">
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Enter ${searchType}...`}
                  />
                  <Button type="submit" disabled={searching}>
                    <Search size={16} className="mr-2" />
                    {searching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* User Details & Promotion */}
      {foundUser && (
        <Card>
          <CardHeader>
            <CardTitle>User Rank Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <h3 className="font-semibold text-lg">{foundUser.displayName}</h3>
                  <p className="text-sm text-gray-600">{foundUser.email}</p>
                </div>
                <Button onClick={openPromoteModal}>
                  <TrendingUp size={16} className="mr-2" />
                  Change Rank
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700 mb-1">Current Rank</p>
                  <p className="text-xl font-bold capitalize">{foundUser.currentRank}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Progress</p>
                  <p className="text-xl font-bold">{foundUser.rankPercentage}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Predictions</p>
                  <p className="text-xl font-bold">{foundUser.totalPredictions}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-700 mb-1">Accuracy</p>
                  <p className="text-xl font-bold">{accuracyRate}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Promote/Demote Modal */}
      <Dialog open={showPromoteModal} onOpenChange={setShowPromoteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Rank</DialogTitle>
          </DialogHeader>
          
          {foundUser && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">User: {foundUser.displayName}</p>
                <p className="text-sm text-gray-600 capitalize">
                  Current Rank: <span className="font-semibold">{foundUser.currentRank}</span>
                </p>
              </div>

              <div>
                <Label>New Rank *</Label>
                <select
                  value={selectedRank}
                  onChange={(e) => setSelectedRank(e.target.value)}
                  className="w-full border rounded-lg p-2 mt-1"
                  required
                >
                  <option value="">Select rank...</option>
                  {RANKS.map((rank) => (
                    <option key={rank.value} value={rank.value}>
                      {rank.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRank && selectedRank !== foundUser.currentRank && (
                <div className={`rounded-lg p-3 ${isPromotion ? 'bg-green-50 border border-green-200' : isDemotion ? 'bg-yellow-50 border border-yellow-200' : ''}`}>
                  <p className={`text-sm font-medium ${isPromotion ? 'text-green-800' : 'text-yellow-800'}`}>
                    {isPromotion ? '⬆️ Promotion' : '⬇️ Demotion'}: {foundUser.currentRank} → {selectedRank}
                  </p>
                </div>
              )}

              <div>
                <Label>Reason *</Label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this rank change is necessary..."
                  className="w-full border rounded-lg p-2 min-h-[100px] mt-1"
                  maxLength={500}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  This reason will be logged for audit purposes
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Important</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>This action will be logged in the audit trail</li>
                      <li>User rank percentage will be reset to 0</li>
                      <li>Manual adjustment flag will be set</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handlePromote}
                  disabled={!selectedRank || !reason.trim() || promoting || selectedRank === foundUser.rank}
                >
                  {promoting ? 'Processing...' : 'Confirm Change'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPromoteModal(false)}
                  disabled={promoting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {!foundUser && !searching && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <TrendingUp className="mx-auto mb-4" size={48} />
            <p>Search for a user to manage their rank</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
