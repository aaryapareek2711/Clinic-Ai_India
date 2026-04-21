/**
 * CalendarSettings Component
 * Settings page for calendar configuration
 */

import React, { useState } from 'react';
import { Clock, Calendar, Settings as SettingsIcon } from 'lucide-react';
import { CalendarSettings as CalendarSettingsType } from '@/lib/types/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const defaultSettings: CalendarSettingsType = {
  startTime: 7,
  endTime: 20,
  slotDuration: 60,
  weekStartsOn: 1,
  workingDays: [1, 2, 3, 4, 5],
  defaultAppointmentDuration: 60,
  allowDoubleBooking: false,
  showWeekends: false,
};

export const CalendarSettings: React.FC = () => {
  const [settings, setSettings] = useState<CalendarSettingsType>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    // Show success message
    alert('Calendar settings saved successfully!');
  };

  const handleSettingChange = <K extends keyof CalendarSettingsType>(
    key: K,
    value: CalendarSettingsType[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleWorkingDay = (day: number) => {
    setSettings(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day].sort(),
    }));
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Calendar Settings</h2>
        <p className="text-gray-600 mt-1">Configure your calendar preferences and availability</p>
      </div>

      {/* Working Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Working Hours
          </CardTitle>
          <CardDescription>
            Set your default working hours for appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Select
                id="startTime"
                value={settings.startTime.toString()}
                onChange={(e) => handleSettingChange('startTime', parseInt(e.target.value))}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Select
                id="endTime"
                value={settings.endTime.toString()}
                onChange={(e) => handleSettingChange('endTime', parseInt(e.target.value))}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="defaultDuration">Default Appointment Duration (minutes)</Label>
            <Input
              id="defaultDuration"
              type="number"
              min="15"
              step="15"
              value={settings.defaultAppointmentDuration}
              onChange={(e) =>
                handleSettingChange('defaultAppointmentDuration', parseInt(e.target.value))
              }
            />
          </div>

          <div>
            <Label htmlFor="slotDuration">Time Slot Interval (minutes)</Label>
            <Select
              id="slotDuration"
              value={settings.slotDuration.toString()}
              onChange={(e) => handleSettingChange('slotDuration', parseInt(e.target.value))}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">60 minutes</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Working Days */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Working Days
          </CardTitle>
          <CardDescription>
            Select which days you're available for appointments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {dayNames.map((day, index) => (
              <button
                key={index}
                onClick={() => toggleWorkingDay(index)}
                className={`p-3 rounded-lg text-sm font-medium transition-colors
                  ${settings.workingDays.includes(index)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {day}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Calendar Preferences
          </CardTitle>
          <CardDescription>
            Customize your calendar display and behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="weekStartsOn">Week Starts On</Label>
            <Select
              id="weekStartsOn"
              value={settings.weekStartsOn.toString()}
              onChange={(e) => handleSettingChange('weekStartsOn', parseInt(e.target.value) as 0 | 1 | 6)}
            >
              <option value="0">Sunday</option>
              <option value="1">Monday</option>
              <option value="6">Saturday</option>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Show Weekends</Label>
              <p className="text-sm text-gray-500">Display Saturday and Sunday in calendar</p>
            </div>
            <button
              onClick={() => handleSettingChange('showWeekends', !settings.showWeekends)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${settings.showWeekends ? 'bg-blue-600' : 'bg-gray-200'}
              `}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${settings.showWeekends ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Allow Double Booking</Label>
              <p className="text-sm text-gray-500">Allow multiple appointments at the same time</p>
            </div>
            <button
              onClick={() => handleSettingChange('allowDoubleBooking', !settings.allowDoubleBooking)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${settings.allowDoubleBooking ? 'bg-blue-600' : 'bg-gray-200'}
              `}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${settings.allowDoubleBooking ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default CalendarSettings;
