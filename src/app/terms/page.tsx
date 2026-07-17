import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 px-6 max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms & Conditions</h1>
          
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              By proceeding with a booking at Madras Flavours Events, you agree to the following terms and conditions:
            </p>
            
            <ul className="list-disc pl-6 space-y-4">
              <li>
                <strong>25% of the non-refundable Catering amount</strong> should be taken as advance and before 24 hours of the event day customer should pay the full invoice amount.
              </li>
              <li>
                Quotation is valid for <strong>07 days</strong> from the date of the original quote offered.
              </li>
              <li>
                Any food procured for an event, on a specific event date is to be consumed on the same day and <strong>not for retailing purpose</strong>.
              </li>
              <li>
                The Buffet Service price is based on <strong>2 Hours</strong>; any additional hours will be charged.
              </li>
              <li>
                We outsourced private delivery on your behalf; Hence Madras Flavours <strong>does not take any responsibility</strong> for any inconvenience caused by the delivery driver.
              </li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
