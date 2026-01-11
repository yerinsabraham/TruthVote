// src/components/admin/content/SupportTickets.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { 
  Inbox,
  CheckCircle,
  Clock,
  AlertCircle,
  Bug,
  Lightbulb,
  Flag,
  User,
  HelpCircle,
  RefreshCw,
  Trash2,
  MessageSquare,
  Mail,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  type: string;
  message: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  adminResponse?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Bug; color: string }> = {
  bug: { label: 'Bug Report', icon: Bug, color: 'text-red-500 bg-red-500/10' },
  feature: { label: 'Feature Request', icon: Lightbulb, color: 'text-yellow-500 bg-yellow-500/10' },
  content: { label: 'Content Issue', icon: Flag, color: 'text-orange-500 bg-orange-500/10' },
  account: { label: 'Account Problem', icon: User, color: 'text-blue-500 bg-blue-500/10' },
  other: { label: 'Other', icon: HelpCircle, color: 'text-gray-500 bg-gray-500/10' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  open: { label: 'Open', icon: Inbox, color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
  'in-progress': { label: 'In Progress', icon: Clock, color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' },
  resolved: { label: 'Resolved', icon: CheckCircle, color: 'text-green-500 bg-green-500/10 border-green-500/30' },
  closed: { label: 'Closed', icon: X, color: 'text-gray-500 bg-gray-500/10 border-gray-500/30' },
};

export default function SupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'support_reports'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const ticketData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SupportTicket[];
      
      setTickets(ticketData);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      setUpdating(true);
      const ticketRef = doc(db, 'support_reports', ticketId);
      await updateDoc(ticketRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });
      
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, status: newStatus as SupportTicket['status'], updatedAt: Timestamp.now() } : t
      ));
      
      toast.success(`Ticket marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Failed to update ticket');
    } finally {
      setUpdating(false);
    }
  };

  const submitResponse = async (ticketId: string) => {
    if (!responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }
    
    try {
      setUpdating(true);
      const ticketRef = doc(db, 'support_reports', ticketId);
      await updateDoc(ticketRef, {
        adminResponse: responseText.trim(),
        status: 'in-progress',
        updatedAt: Timestamp.now()
      });
      
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, adminResponse: responseText.trim(), status: 'in-progress', updatedAt: Timestamp.now() } : t
      ));
      
      setResponseText('');
      setRespondingTo(null);
      toast.success('Response saved');
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to submit response');
    } finally {
      setUpdating(false);
    }
  };

  const deleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this ticket?')) return;
    
    try {
      setUpdating(true);
      await deleteDoc(doc(db, 'support_reports', ticketId));
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      toast.success('Ticket deleted');
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast.error('Failed to delete ticket');
    } finally {
      setUpdating(false);
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    if (filterStatus !== 'all' && ticket.status !== filterStatus) return false;
    if (filterType !== 'all' && ticket.type !== filterType) return false;
    return true;
  });

  // Stats
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in-progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  if (loading) {
    return (
      <div className="admin-content-area">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[var(--admin-primary)]" />
            <p className="text-[var(--admin-text-secondary)]">Loading tickets...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-content-area">
      {/* Header */}
      <div className="admin-content-header">
        <div>
          <h1 className="admin-content-title">Support Tickets</h1>
          <p className="admin-content-subtitle">Manage user support requests and issues</p>
        </div>
        <button
          onClick={loadTickets}
          disabled={loading}
          className="admin-btn admin-btn-secondary"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="admin-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Inbox size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--admin-text-primary)]">{stats.total}</p>
              <p className="text-sm text-[var(--admin-text-secondary)]">Total</p>
            </div>
          </div>
        </div>
        <div className="admin-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertCircle size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--admin-text-primary)]">{stats.open}</p>
              <p className="text-sm text-[var(--admin-text-secondary)]">Open</p>
            </div>
          </div>
        </div>
        <div className="admin-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Clock size={20} className="text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--admin-text-primary)]">{stats.inProgress}</p>
              <p className="text-sm text-[var(--admin-text-secondary)]">In Progress</p>
            </div>
          </div>
        </div>
        <div className="admin-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--admin-text-primary)]">{stats.resolved}</p>
              <p className="text-sm text-[var(--admin-text-secondary)]">Resolved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="admin-input"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="admin-input"
            >
              <option value="all">All Types</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="content">Content Issue</option>
              <option value="account">Account Problem</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="admin-card p-12 text-center">
          <Inbox size={48} className="mx-auto mb-4 text-[var(--admin-text-muted)]" />
          <h3 className="text-lg font-medium text-[var(--admin-text-primary)] mb-2">No tickets found</h3>
          <p className="text-[var(--admin-text-secondary)]">
            {tickets.length === 0 
              ? "No support tickets have been submitted yet."
              : "No tickets match your current filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => {
            const typeConfig = TYPE_CONFIG[ticket.type] || TYPE_CONFIG.other;
            const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
            const TypeIcon = typeConfig.icon;
            const StatusIcon = statusConfig.icon;
            const isExpanded = expandedTicket === ticket.id;
            const isResponding = respondingTo === ticket.id;

            return (
              <div key={ticket.id} className="admin-card overflow-hidden">
                {/* Ticket Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-[var(--admin-bg-secondary)] transition-colors"
                  onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Type Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${typeConfig.color}`}>
                      <TypeIcon size={20} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-[var(--admin-text-primary)]">
                          {ticket.userName || 'Anonymous'}
                        </span>
                        <span className="text-[var(--admin-text-muted)]">•</span>
                        <span className="text-sm text-[var(--admin-text-secondary)]">
                          {ticket.userEmail}
                        </span>
                      </div>
                      <p className="text-[var(--admin-text-secondary)] line-clamp-2">
                        {ticket.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusConfig.color}`}>
                          <StatusIcon size={12} className="inline mr-1" />
                          {statusConfig.label}
                        </span>
                        <span className="text-xs text-[var(--admin-text-muted)]">
                          {ticket.createdAt?.toDate 
                            ? formatDistanceToNow(ticket.createdAt.toDate(), { addSuffix: true })
                            : 'Unknown'}
                        </span>
                      </div>
                    </div>

                    {/* Expand Icon */}
                    <div className="flex-shrink-0">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-[var(--admin-border)] p-4 bg-[var(--admin-bg-secondary)]">
                    {/* Full Message */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-[var(--admin-text-secondary)] mb-2">Full Message</h4>
                      <p className="text-[var(--admin-text-primary)] whitespace-pre-wrap bg-[var(--admin-bg-primary)] p-3 rounded-lg">
                        {ticket.message}
                      </p>
                    </div>

                    {/* Admin Response */}
                    {ticket.adminResponse && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-[var(--admin-text-secondary)] mb-2">Admin Response</h4>
                        <p className="text-[var(--admin-text-primary)] whitespace-pre-wrap bg-green-500/5 border border-green-500/20 p-3 rounded-lg">
                          {ticket.adminResponse}
                        </p>
                      </div>
                    )}

                    {/* Response Form */}
                    {isResponding && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-[var(--admin-text-secondary)] mb-2">Write Response</h4>
                        <textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          rows={3}
                          className="admin-input w-full resize-none"
                          placeholder="Enter your response to the user..."
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => submitResponse(ticket.id)}
                            disabled={updating}
                            className="admin-btn admin-btn-primary"
                          >
                            Save Response
                          </button>
                          <button
                            onClick={() => { setRespondingTo(null); setResponseText(''); }}
                            className="admin-btn admin-btn-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {!isResponding && (
                        <button
                          onClick={() => { setRespondingTo(ticket.id); setResponseText(ticket.adminResponse || ''); }}
                          className="admin-btn admin-btn-secondary"
                        >
                          <MessageSquare size={14} />
                          {ticket.adminResponse ? 'Edit Response' : 'Add Response'}
                        </button>
                      )}
                      
                      <a
                        href={`mailto:${ticket.userEmail}?subject=Re: TruthVote Support - ${typeConfig.label}&body=Hi ${ticket.userName},%0D%0A%0D%0ARegarding your ${typeConfig.label.toLowerCase()}:%0D%0A"${ticket.message.substring(0, 100)}..."%0D%0A%0D%0A`}
                        className="admin-btn admin-btn-secondary"
                      >
                        <Mail size={14} />
                        Email User
                      </a>

                      {ticket.status === 'open' && (
                        <button
                          onClick={() => updateTicketStatus(ticket.id, 'in-progress')}
                          disabled={updating}
                          className="admin-btn admin-btn-secondary"
                        >
                          <Clock size={14} />
                          Mark In Progress
                        </button>
                      )}

                      {(ticket.status === 'open' || ticket.status === 'in-progress') && (
                        <button
                          onClick={() => updateTicketStatus(ticket.id, 'resolved')}
                          disabled={updating}
                          className="admin-btn admin-btn-primary"
                        >
                          <CheckCircle size={14} />
                          Mark Resolved
                        </button>
                      )}

                      {ticket.status === 'resolved' && (
                        <button
                          onClick={() => updateTicketStatus(ticket.id, 'closed')}
                          disabled={updating}
                          className="admin-btn admin-btn-secondary"
                        >
                          <X size={14} />
                          Close Ticket
                        </button>
                      )}

                      <button
                        onClick={() => deleteTicket(ticket.id)}
                        disabled={updating}
                        className="admin-btn admin-btn-danger ml-auto"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
