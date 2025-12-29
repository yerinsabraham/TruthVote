// src/components/admin/UsersManager.tsx
'use client';

import { useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, User, TrendingUp } from 'lucide-react';


interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  currentRank: string;
  rankPercentage: number;
  totalPredictions: number;
  correctPredictions: number;
  createdAt: { toDate: () => Date } | null;
  lastActive: { toDate: () => Date } | null;
}

interface RankHistoryEntry {
  previousRank: string;
  newRank: string;
  timestamp: { toDate: () => Date } | null;
  trigger?: string;
  reason?: string;
}

export default function UsersManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'email' | 'username' | 'id'>('email');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [userHistory, setUserHistory] = useState<RankHistoryEntry[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    try {
      setSearching(true);
      setFoundUser(null);
      setUserHistory([]);

      let userDoc;
      
      if (searchType === 'id') {
        // Search by user ID
        const docRef = doc(db, 'users', searchTerm.trim());
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          userDoc = { id: docSnap.id, ...docSnap.data() };
        }
      } else if (searchType === 'email') {
        // Search by email - try exact match first, then partial
        const searchLower = searchTerm.trim().toLowerCase();
        
        // Try exact match first
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
        // Search by username/displayName - partial match
        const searchLower = searchTerm.trim().toLowerCase();
        
        // Try exact match first
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
        
        // Load user's rank history
        const historyQuery = query(
          collection(db, 'rankHistory'),
          where('userId', '==', userDoc.id)
        );
        const historySnapshot = await getDocs(historyQuery);
        const history = historySnapshot.docs.map(doc => doc.data() as RankHistoryEntry);
        setUserHistory(history);
        
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

  const accuracyRate = foundUser && foundUser.totalPredictions > 0
    ? ((foundUser.correctPredictions / foundUser.totalPredictions) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">User Management</h2>

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

      {/* User Details */}
      {foundUser && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                      <User size={32} className="text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{foundUser.displayName}</h3>
                      <p className="text-sm text-gray-600">{foundUser.email}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">User ID:</span>
                      <span className="font-mono text-xs">{foundUser.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Created:</span>
                      <span>{foundUser.createdAt?.toDate().toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Active:</span>
                      <span>{foundUser.lastActive?.toDate().toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="text-blue-600" size={20} />
                      <span className="font-semibold">Current Rank</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold capitalize">{foundUser.currentRank}</span>
                      <span className="text-sm text-gray-600">{foundUser.rankPercentage}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600">Total Predictions</p>
                      <p className="text-2xl font-bold">{foundUser.totalPredictions}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600">Correct</p>
                      <p className="text-2xl font-bold">{foundUser.correctPredictions}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 col-span-2">
                      <p className="text-sm text-green-700">Accuracy Rate</p>
                      <p className="text-2xl font-bold text-green-700">{accuracyRate}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rank History */}
          {userHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Rank History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userHistory.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div>
                        <p className="font-medium">
                          <span className="capitalize">{entry.previousRank}</span>
                          {' → '}
                          <span className="capitalize text-blue-600">{entry.newRank}</span>
                        </p>
                        <p className="text-sm text-gray-600 capitalize">
                          Trigger: {entry.trigger?.replace('_', ' ')}
                        </p>
                        {entry.reason && (
                          <p className="text-sm text-gray-600">Reason: {entry.reason}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {entry.timestamp?.toDate().toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!foundUser && !searching && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <User className="mx-auto mb-4" size={48} />
            <p>Search for a user to view their details</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
