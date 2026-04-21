import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/middleware";
import type { Appointment, SecureMessage } from "@/lib/types/dashboard";
import { Calendar, CheckSquare, Mail, ClipboardCheck, Sparkles } from "lucide-react";
import Link from "next/link";

// Mock Data Fetching
async function getPatientDashboardData(patientId: string) {
  // In a real app, this would fetch data from your API
  const upcomingAppointment: Appointment = {
    id: "appt-123",
    providerName: "Dr. Smith",
    specialty: "Cardiology",
    date: new Date(new Date().setDate(new Date().getDate() + 3)),
    type: "Virtual",
  };

  // Note: PreVisit tasks are now handled via CarePrep links sent by providers
  // No need for hardcoded tasks in patient dashboard

  const recentMessages: SecureMessage[] = [
    { id: "msg-1", from: "Dr. Smith's Office", subject: "Your recent lab results", snippet: "Your results for the lipid panel are now available...", timestamp: "2 days ago", read: false },
    { id: "msg-2", from: "Billing Department", subject: "Your recent statement", snippet: "A new statement is available for your review...", timestamp: "5 days ago", read: true },
  ];

  return { upcomingAppointment, recentMessages };
}

export default async function PatientDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { upcomingAppointment, recentMessages } = await getPatientDashboardData(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name.split(' ')[0]}!</h1>
          <p className="text-gray-600 mt-1">Prepare for your upcoming appointment.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Upcoming Appointment
              </CardTitle>
              <CardDescription>Your next scheduled visit.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                <div>
                  <p className="font-bold text-lg text-gray-900">{upcomingAppointment.providerName}</p>
                  <p className="text-sm text-gray-600">{upcomingAppointment.specialty}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {upcomingAppointment.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    {' at '}
                    {upcomingAppointment.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Badge className={upcomingAppointment.type === 'Virtual' ? 'bg-cyan-100 text-cyan-700' : 'bg-green-100 text-green-700'}>
                  {upcomingAppointment.type}
                </Badge>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">View Appointment Details</Button>
            </CardFooter>
          </Card>

          {/* Appointment Prep Summary - New Unified Experience */}
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-600" />
                Appointment Preparation
                <Sparkles className="w-4 h-4 text-blue-500 ml-1" />
              </CardTitle>
              <CardDescription>
                Get ready for your visit with personalized preparation guidance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  Your AI-powered appointment prep summary includes:
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-green-600" />
                    <span>Personalized discussion topics based on your health</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-green-600" />
                    <span>Medication and allergy review</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-green-600" />
                    <span>Interactive appointment checklist</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-green-600" />
                    <span>Recent symptom analysis summary</span>
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600 mb-2">
                    <strong className="text-blue-700">New:</strong> We've combined your symptom analysis and appointment preparation into one easy-to-use summary!
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/patient/appointment-prep" className="w-full">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  View Appointment Prep Summary
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                CarePrep
              </CardTitle>
              <CardDescription>Prepare for your upcoming appointment</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-900 mb-4">
                Your healthcare provider will send you a CarePrep link via email or text message before your appointment.
                This link allows you to:
              </p>
              <ul className="space-y-2 text-sm text-blue-800 mb-4">
                <li className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-green-600" />
                  Update your medical history and current medications
                </li>
                <li className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-green-600" />
                  Report any symptoms you're experiencing
                </li>
                <li className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-green-600" />
                  Help your provider prepare for your visit
                </li>
              </ul>
              <div className="p-3 bg-white rounded-lg border border-blue-200">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> You don't need to log in - the CarePrep link works directly from your email or text message.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-gray-600" />
                Recent Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {recentMessages.map(msg => (
                  <li key={msg.id} className="border-b pb-3 last:border-b-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-sm text-gray-900">{msg.from}</p>
                      {!msg.read && <Badge className="bg-red-100 text-red-700">New</Badge>}
                    </div>
                    <p className="text-sm text-gray-800 font-medium">{msg.subject}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{msg.snippet}</p>
                    <p className="text-xs text-gray-400 mt-1">{msg.timestamp}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">View All Messages</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
