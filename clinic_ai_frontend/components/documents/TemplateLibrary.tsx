import React from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';

export const TemplateLibrary = () => {
  return (
    <div className="bg-blue-50 rounded-lg p-12 text-center border-2 border-dashed border-blue-200">
      <div className="max-w-2xl mx-auto">
        {/* Illustration */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            {/* Book Stack Illustration */}
            <div className="flex items-end gap-2">
              <div className="w-16 h-20 bg-orange-500 rounded-t-lg"></div>
              <div className="w-16 h-24 bg-green-500 rounded-t-lg"></div>
              <div className="w-16 h-16 bg-blue-600 rounded-t-lg"></div>
              <div className="w-16 h-28 bg-yellow-500 rounded-t-lg"></div>
            </div>
            {/* Decorative Clock */}
            <div className="absolute -top-4 -right-8 w-12 h-12 bg-blue-100 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-600 rounded-full relative">
                <div className="absolute top-1/2 left-1/2 w-0.5 h-2 bg-blue-600 -translate-x-1/2 -translate-y-full origin-bottom"></div>
                <div className="absolute top-1/2 left-1/2 w-0.5 h-1.5 bg-blue-600 -translate-x-1/2 -translate-y-full origin-bottom rotate-90"></div>
              </div>
            </div>
            {/* Decorative Flower */}
            <div className="absolute -top-2 -left-6 w-10 h-10">
              <div className="w-8 h-8 bg-red-500 rounded-full"></div>
              <div className="absolute bottom-0 left-1/2 w-1 h-6 bg-green-600 -translate-x-1/2"></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Explore our new template library.
        </h2>
        <p className="text-base text-gray-600 mb-6 leading-relaxed">
          Discover new Progress Note, Intake Form, and Assessment templates in our Template Library.
          <br />
          Quickly add any template from here, and customize it as you see fit.
        </p>

        {/* CTA Button */}
        <Button
          size="lg"
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8"
        >
          Get Started
        </Button>
      </div>
    </div>
  );
};
