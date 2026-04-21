'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, ListTodo, Plus, TrendingUp, Clock, FileText, Stethoscope, Edit3, Sparkles, ClipboardList, Send, Eye, AlertTriangle, Target, Activity } from "lucide-react";
import Link from "next/link";
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/stores/authStore';
import PreVisitPrepModal from '@/components/provider/PreVisitPrepModal';
import { WelcomeModal } from '@/components/dashboard/WelcomeModal';

type CareprepStatus = 'not_sent' | 'pending' | 'completed';
type AppointReadyStatus = 'Ready' | 'Pending' | 'Incomplete';
type RiskLevel = 'high' | 'medium' | 'low';

interface ScheduledAppointment {
  id: string;
  patient: { id: string; name: string };
  time: string;
  reason: string;
  isNewPatient: boolean;
  careprepStatus: CareprepStatus;
  riskLevel: RiskLevel;
  careGapsCount: number;
}

interface PatientListItem {
  id: string;
  name: string;
  lastSeen: string;
  appointReadyStatus: AppointReadyStatus;
}

interface ProviderTask {
  id: string;
  description: string;
  patientName: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
}

interface RecentVisit {
  id: string;
  patientName: string;
  visitDate: string;
  chiefComplaint: string;
  soapStatus: 'completed' | 'in_progress' | 'pending';
  visitId: string;
}

const statusColorMap: Record<AppointReadyStatus, string> = {
  Ready: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Incomplete: "bg-red-100 text-red-700",
};

const soapStatusColorMap = {
  completed: "bg-green-100 text-green-700",
  in_progress: "bg-blue-100 text-blue-700",
  pending: "bg-orange-100 text-orange-700",
};

const soapStatusLabelMap = {
  completed: "Complete",
  in_progress: "In Progress",
  pending: "Not Started",
};

const riskColorMap: Record<RiskLevel, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

export default function ProviderDashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [selectedAppointment, setSelectedAppointment] = useState<ScheduledAppointment | null>(null);
  const [todaysSchedule, setTodaysSchedule] = useState<ScheduledAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentingAppointment, setDocumentingAppointment] = useState<string | null>(null);

  // Derived state
  const pendingSOAPNotes = 0; // TODO: Fetch from API
  const highRiskPatients = todaysSchedule.filter(a => a.riskLevel === 'high').length;
  const pendingTasks: ProviderTask[] = []; // TODO: Fetch from API
  const recentVisits: RecentVisit[] = []; // TODO: Fetch from API
  const patientList: PatientListItem[] = todaysSchedule.map(appt => ({
    id: appt.patient.id,
    name: appt.patient.name,
    lastSeen: "Today",
    appointReadyStatus: "Ready" // Mock
  }));

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user?.id) return;

      try {
        const token = localStorage.getItem('access_token');
        // Fetch upcoming appointments instead of today's, to show seeded future data
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || '/api'}/api/appointments/provider/${user.id}/upcoming`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (response.data && response.data.appointments) {
          const mappedAppointments: ScheduledAppointment[] = response.data.appointments.map((appt: any) => ({
            id: appt.appointment_id,
            patient: {
              id: appt.patient_id,
              name: appt.patient_name || 'Unknown Patient'
            },
            time: new Date(appt.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            reason: appt.chief_complaint || 'General Visit',
            isNewPatient: appt.appointment_type === 'initial_consultation',
            careprepStatus: appt.previsit_completed ? 'completed' : 'not_sent', // Simple mapping
            riskLevel: 'medium', // Default
            careGapsCount: 0 // Default
          }));
          setTodaysSchedule(mappedAppointments);
        }
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user?.id]);

  const handleStartDocumentation = async (appointmentId: string) => {
    setDocumentingAppointment(appointmentId);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `/api/visits/from-appointment/${appointmentId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      router.push(`/provider/visits/${response.data.id}`);
    } catch (error: any) {
      console.error('Error starting visit documentation:', error);
      toast.error(error.response?.data?.detail || 'Failed to start visit documentation');
    } finally {
      setDocumentingAppointment(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-8 px-6 rounded-2xl shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Provider Dashboard</h1>
            <p className="text-slate-300 mt-2">Welcome back, {user?.full_name || user?.email || 'Provider'}</p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">

            <Link href="/provider/templates">
              <Button variant="ghost" size="sm" className="bg-white/10 text-white hover:bg-white/20 border border-white/20">
                <FileText className="w-4 h-4 mr-2" /> Templates
              </Button>
            </Link>
            <Link href="/careprep">
              <Button variant="ghost" size="sm" className="bg-white/10 text-white hover:bg-white/20 border border-white/20">
                <Stethoscope className="w-4 h-4 mr-2" /> CarePrep
              </Button>
            </Link>
            <Link href="/provider/visits/new">
              <Button variant="primary" size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" /> New Visit
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card className="hover:scale-105 transition-transform duration-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1.5">Patients Today</p>
                <h3 className="text-3xl font-bold text-slate-900">{todaysSchedule.length}</h3>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-2 font-medium">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +3 from yesterday
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:scale-105 transition-transform duration-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1.5">High Risk</p>
                <h3 className="text-3xl font-bold text-red-600">{highRiskPatients}</h3>
                <p className="text-xs text-slate-600 mt-2">Patients need attention</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:scale-105 transition-transform duration-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1.5">Pending Tasks</p>
                <h3 className="text-3xl font-bold text-slate-900">{pendingTasks.length}</h3>
                <p className="text-xs text-slate-600 mt-2">
                  {pendingTasks.filter(t => t.priority === 'High').length} high priority
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <ListTodo className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:scale-105 transition-transform duration-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1.5">Care Gaps</p>
                <h3 className="text-3xl font-bold text-slate-900">
                  {todaysSchedule.reduce((acc, a) => acc + a.careGapsCount, 0)}
                </h3>
                <p className="text-xs text-slate-600 mt-2">Across all patients</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:scale-105 transition-transform duration-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1.5">SOAP Notes</p>
                <h3 className="text-3xl font-bold text-slate-900">{pendingSOAPNotes}</h3>
                <p className="text-xs text-slate-600 mt-2">
                  {pendingSOAPNotes > 0 ? 'Pending docs' : 'All complete ✓'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule with Context Badges */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Upcoming Schedule
                  </CardTitle>
                  <CardDescription>{todaysSchedule.length} appointments • Click patient name for pre-visit prep</CardDescription>
                </div>
                <Badge className="bg-blue-100 text-blue-700">
                  <Activity className="w-3 h-3 mr-1" />
                  ContextAI Enabled
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {todaysSchedule.map(appt => (
                  <li key={appt.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="font-mono text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded font-semibold">
                        {appt.time}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Clickable patient name opens Pre-Visit Prep */}
                          <button
                            onClick={() => setSelectedAppointment(appt)}
                            className="font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-colors"
                          >
                            {appt.patient.name}
                          </button>
                          {appt.isNewPatient && (
                            <Badge className="bg-cyan-100 text-cyan-700 text-xs">New</Badge>
                          )}
                          {/* Risk Badge */}
                          <Badge className={`text-xs ${riskColorMap[appt.riskLevel]}`}>
                            {appt.riskLevel === 'high' && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {appt.riskLevel.charAt(0).toUpperCase() + appt.riskLevel.slice(1)} Risk
                          </Badge>
                          {/* Care Gaps Badge */}
                          {appt.careGapsCount > 0 && (
                            <Badge className="bg-purple-100 text-purple-700 text-xs">
                              <Target className="w-3 h-3 mr-1" />
                              {appt.careGapsCount} Gaps
                            </Badge>
                          )}
                          {/* CarePrep Status */}
                          {appt.careprepStatus === "completed" && (
                            <Badge className="bg-green-100 text-green-700 text-xs">CarePrep ✓</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{appt.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {appt.careprepStatus === "completed" ? (
                        <Link href={`/careprep/responses/${appt.patient.id}`}>
                          <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      ) : appt.careprepStatus === "pending" ? (
                        <Button variant="outline" size="sm" className="text-yellow-600 border-yellow-200 hover:bg-yellow-50">
                          <Clock className="w-4 h-4 mr-1" />
                          Awaiting
                        </Button>
                      ) : (
                        <Link href={`/careprep/send/${appt.patient.id}?appointment=${appt.id}`}>
                          <Button variant="outline" size="sm" className="text-purple-600 border-purple-200 hover:bg-purple-50">
                            <Send className="w-4 h-4 mr-1" />
                            CarePrep
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={documentingAppointment === appt.id}
                        onClick={() => handleStartDocumentation(appt.id)}
                      >
                        {documentingAppointment === appt.id ? 'Starting...' : 'Document'}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Recent Visits & SOAP Notes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-purple-600" />
                    Recent Visits & SOAP Notes
                  </CardTitle>
                  <CardDescription>Documentation status for recent encounters</CardDescription>
                </div>
                <Link href="/provider/visits/new">
                  <Button variant="primary" size="sm" className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Start New Visit
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {recentVisits.map(visit => (
                  <li key={visit.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{visit.patientName}</span>
                        <Badge className={soapStatusColorMap[visit.soapStatus]}>
                          {soapStatusLabelMap[visit.soapStatus]}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{visit.chiefComplaint}</p>
                      <p className="text-xs text-gray-500 mt-1">{visit.visitDate}</p>
                    </div>
                    <Link href={`/provider/visits/${visit.visitId}`}>
                      <Button variant="outline" size="sm">
                        {visit.soapStatus === 'completed' ? (
                          <>
                            <FileText className="w-4 h-4 mr-2" />
                            View
                          </>
                        ) : (
                          <>
                            <Edit3 className="w-4 h-4 mr-2" />
                            Document
                          </>
                        )}
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
              {pendingSOAPNotes > 0 && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800 font-medium">
                    ⚠️ {pendingSOAPNotes} visit{pendingSOAPNotes > 1 ? 's' : ''} need documentation
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Patient Watchlist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                Patient Watchlist
              </CardTitle>
              <CardDescription>CarePrep status for upcoming visits</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {patientList.map(p => (
                  <li key={p.id} className="flex justify-between items-center p-2 rounded hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">Last seen: {p.lastSeen}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/careprep/send/${p.id}`}>
                        <Button variant="ghost" size="sm" className="text-purple-600 hover:bg-purple-50 h-7 px-2">
                          <ClipboardList className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      <Badge className={statusColorMap[p.appointReadyStatus]}>
                        {p.appointReadyStatus}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Pending Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-gray-600" />
                Pending Tasks
              </CardTitle>
              <CardDescription>Items requiring your attention</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {pendingTasks.map(task => (
                  <li key={task.id} className="border-b pb-3 last:border-b-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-sm text-gray-900">{task.description}</p>
                      <Badge className={task.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}>
                        {task.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      For: <span className="font-medium">{task.patientName}</span> • Due: {task.dueDate}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Quick Templates */}
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  Quick Templates
                </CardTitle>
                <Link href="/provider/templates">
                  <Button variant="ghost" size="sm" className="text-amber-700 hover:text-amber-900">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="p-3 bg-white rounded-lg border border-amber-200 hover:border-amber-300 cursor-pointer">
                  <p className="font-semibold text-sm text-slate-900">General Visit</p>
                  <p className="text-xs text-slate-600">Standard SOAP template</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-amber-200 hover:border-amber-300 cursor-pointer">
                  <p className="font-semibold text-sm text-slate-900">Annual Physical</p>
                  <p className="text-xs text-slate-600">Comprehensive exam template</p>
                </div>
              </div>
              <Link href="/provider/templates">
                <Button variant="primary" size="sm" className="w-full mt-4 bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pre-Visit Prep Modal */}
      {selectedAppointment && (
        <PreVisitPrepModal
          isOpen={!!selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          appointment={selectedAppointment}
        />
      )}
      <WelcomeModal />
    </div>
  );
}
