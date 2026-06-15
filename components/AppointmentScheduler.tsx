import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, User, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { SavedPatient } from '../types';
import { db } from '../services/db';

interface Props {
  patients: SavedPatient[];
  onRefresh: () => void;
}

const AppointmentScheduler: React.FC<Props> = ({ patients, onRefresh }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Get days in current month
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const appointments = patients.filter(p => p.followUpDate).map(p => ({
    ...p,
    dateObj: new Date(p.followUpDate as string)
  })).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  const getAppointmentsForDay = (day: number) => {
    return appointments.filter(a => 
      a.dateObj.getDate() === day && 
      a.dateObj.getMonth() === currentDate.getMonth() &&
      a.dateObj.getFullYear() === currentDate.getFullYear()
    );
  };

  const handleDateClick = async (day: number) => {
    // In a real app we'd open a modal to schedule a specific patient to this date.
    // For simplicity, let's just log or show a small alert, or we can add a simple selector.
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    const patientName = window.prompt(`Schedule an appointment for ${dateStr}.\nEnter patient name:`);
    if (!patientName) return;

    // Try to find patient by name, or if not possible, it's just a dummy demo functionality. 
    // Usually it should open a select patient modal.
    const matchedPatient = patients.find(p => p.name?.toLowerCase().includes(patientName.toLowerCase()) || p.patientName?.toLowerCase().includes(patientName.toLowerCase()));
    
    if (matchedPatient) {
      const updatedPatient = { ...matchedPatient, followUpDate: dateStr };
      try {
        await db.patients.add(updatedPatient);
        onRefresh();
      } catch (e) {
        console.error(e);
      }
    } else {
      alert("Patient not found. Please type the exact name from the patient list.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2rem] border border-purple-100 p-6 md:p-8 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-purple-900 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-purple-600" /> Appointment Calendar
          </h2>
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-purple-900 w-32 text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={nextMonth} className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-purple-100 border border-purple-100 rounded-2xl overflow-hidden">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-purple-50 py-3 text-center text-xs font-bold tracking-widest uppercase text-purple-600">
              {day}
            </div>
          ))}
          
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white min-h-[100px]" />
          ))}
          
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayAppointments = getAppointmentsForDay(day);
            const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
            
            return (
              <div 
                key={day} 
                onClick={() => handleDateClick(day)}
                className={`bg-white min-h-[100px] p-2 border-t border-purple-50 hover:bg-purple-50/50 transition-colors cursor-pointer group`}
              >
                <div className="flex justify-between items-start">
                  <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold ${
                    isToday ? 'bg-purple-600 text-white shadow-md' : 'text-purple-900 group-hover:text-purple-600'
                  }`}>
                    {day}
                  </span>
                  <button className="opacity-0 group-hover:opacity-100 p-1 text-purple-400 hover:text-purple-600 transition-opacity">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="mt-2 flex flex-col gap-1">
                  {dayAppointments.map((apt, idx) => (
                    <div key={idx} className="px-2 py-1 bg-amber-50 border border-amber-100 rounded-lg text-xs font-bold text-amber-800 truncate" title={apt.name || apt.patientName}>
                      {apt.name || apt.patientName || 'NN'}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-purple-100 p-6 md:p-8 shadow-sm">
         <h2 className="text-xl font-black text-purple-900 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" /> Upcoming Appointments
          </h2>
          <div className="space-y-3">
             {appointments.filter(a => a.dateObj >= new Date(new Date().setHours(0,0,0,0))).length === 0 ? (
                <div className="text-center py-8 text-purple-400 font-medium">No upcoming appointments scheduled.</div>
             ) : (
                appointments.filter(a => a.dateObj >= new Date(new Date().setHours(0,0,0,0))).map((apt, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-purple-50/50 border border-purple-100 rounded-2xl hover:bg-white transition-colors">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                           <User className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                           <div className="font-bold text-purple-900">{apt.name || apt.patientName || 'NN'}</div>
                           <div className="text-sm text-purple-500">{apt.phone || '-'}</div>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className="font-bold text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1 rounded-xl">
                          {apt.dateObj.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        <div className="text-xs text-purple-400 mt-2 font-medium">Follow-up Visit</div>
                     </div>
                  </div>
                ))
             )}
          </div>
      </div>
    </div>
  );
};

export default AppointmentScheduler;
