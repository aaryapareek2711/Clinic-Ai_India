"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function InsurancePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    insuranceProvider: "",
    policyNumber: "",
    groupNumber: "",
    subscriberName: "",
    subscriberDOB: "",
    relationshipToSubscriber: "self",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSaving(false);
    setSavedSuccessfully(true);

    // Redirect back to dashboard after 2 seconds
    setTimeout(() => {
      router.push("/patient/dashboard");
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/patient/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Insurance Information</h1>
          <p className="text-gray-600 mt-1">Verify your insurance details</p>
        </div>
      </div>

      {savedSuccessfully ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
              <h2 className="text-2xl font-bold text-green-900 mb-2">Insurance Verified!</h2>
              <p className="text-green-700 text-center">
                Your insurance information has been saved successfully.
                <br />
                Redirecting to dashboard...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Insurance Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="insuranceProvider" className="text-sm font-medium text-gray-700">
                    Insurance Provider *
                  </label>
                  <input
                    type="text"
                    id="insuranceProvider"
                    name="insuranceProvider"
                    value={formData.insuranceProvider}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Blue Cross Blue Shield"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="policyNumber" className="text-sm font-medium text-gray-700">
                    Policy Number *
                  </label>
                  <input
                    type="text"
                    id="policyNumber"
                    name="policyNumber"
                    value={formData.policyNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter policy number"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="groupNumber" className="text-sm font-medium text-gray-700">
                    Group Number
                  </label>
                  <input
                    type="text"
                    id="groupNumber"
                    name="groupNumber"
                    value={formData.groupNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter group number (if applicable)"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="subscriberName" className="text-sm font-medium text-gray-700">
                    Subscriber Name *
                  </label>
                  <input
                    type="text"
                    id="subscriberName"
                    name="subscriberName"
                    value={formData.subscriberName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Primary insurance holder name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="subscriberDOB" className="text-sm font-medium text-gray-700">
                    Subscriber Date of Birth *
                  </label>
                  <input
                    type="date"
                    id="subscriberDOB"
                    name="subscriberDOB"
                    value={formData.subscriberDOB}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="relationshipToSubscriber" className="text-sm font-medium text-gray-700">
                    Relationship to Subscriber *
                  </label>
                  <select
                    id="relationshipToSubscriber"
                    name="relationshipToSubscriber"
                    value={formData.relationshipToSubscriber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="self">Self</option>
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Tip:</strong> Have your insurance card handy to ensure accurate information entry.
                  This will help prevent delays in processing your visit.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Link href="/patient/dashboard">
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" variant="primary" disabled={isSaving}>
                  {isSaving ? "Verifying..." : "Save & Verify"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong>Privacy & Security:</strong> Your insurance information is encrypted and stored securely
          in compliance with HIPAA regulations. We will only use this information for billing and
          verification purposes.
        </p>
      </div>
    </div>
  );
}
