'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageLayout } from '@/components/ui/page-layout';
import { Clock, Bell, CalendarDays, Globe, Save, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-provider';
import { languages as LANGUAGES, DEFAULT_LANGUAGE, type LanguageCode } from '@/lib/i18n/languages';

const STORAGE_KEY = 'lawyer_general_config';

const DURATIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hrs' },
  { value: 120, label: '2 hours' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 === 0 ? 12 : i % 12;
  const ampm = i < 12 ? 'AM' : 'PM';
  return { value: i, label: `${h}:00 ${ampm}` };
});

interface Config {
  defaultDuration: number;
  notifyEmail: boolean;
  notifyBrowser: boolean;
  workStart: number;
  workEnd: number;
  language: LanguageCode;
}

const DEFAULT_CONFIG: Config = {
  defaultDuration: 60,
  notifyEmail: true,
  notifyBrowser: true,
  workStart: 8,
  workEnd: 18,
  language: DEFAULT_LANGUAGE,
};

export function GeneralConfig() {
  const router = useRouter();
  const { t, setLanguage } = useTranslation();
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const update = <K extends keyof Config>(key: K, value: Config[K]) =>
    setConfig(prev => ({ ...prev, [key]: value }));

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setLanguage(config.language);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <PageLayout
      activePage="chat"
      title={t('settings.generalConfigTitle')}
      subtitle={t('settings.generalConfigSubtitle')}
      onBack={() => router.back()}
      maxWidth="max-w-2xl"
    >
      <div className="flex flex-col gap-5 px-4 py-6 overflow-y-auto h-full pb-10">

        {/* Appointment Defaults */}
        <Card icon={<Clock size={15} className="text-[#e9c176]" />} title={t('settings.appointmentDefaults')}>
          <Label>{t('settings.appointmentDefaultsDesc')}</Label>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {DURATIONS.map(d => (
              <button
                key={d.value}
                onClick={() => update('defaultDuration', d.value)}
                className={`py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${
                  config.defaultDuration === d.value
                    ? 'bg-[#722f37] text-white shadow-lg shadow-[#722f37]/20 border border-[#722f37]'
                    : 'bg-white/[0.03] text-gray-500 hover:text-white hover:bg-white/[0.07] border border-white/[0.06]'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Working Hours */}
        <Card icon={<CalendarDays size={15} className="text-[#e9c176]" />} title={t('settings.workingHours')}>
          <Label>{t('settings.workingHoursDesc')}</Label>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-600 mb-1.5">{t('settings.startOfDay')}</p>
              <SelectInput
                value={config.workStart}
                onChange={v => update('workStart', v)}
                options={HOURS.filter(h => h.value < config.workEnd)}
              />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-600 mb-1.5">{t('settings.endOfDay')}</p>
              <SelectInput
                value={config.workEnd}
                onChange={v => update('workEnd', v)}
                options={HOURS.filter(h => h.value > config.workStart)}
              />
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card icon={<Bell size={15} className="text-[#e9c176]" />} title={t('settings.notifications')}>
          <div className="flex flex-col gap-2">
            <Toggle
              label={t('settings.emailAlerts')}
              description={t('settings.emailAlertsDesc')}
              checked={config.notifyEmail}
              onChange={v => update('notifyEmail', v)}
            />
            <Toggle
              label={t('settings.browserNotifications')}
              description={t('settings.browserNotificationsDesc')}
              checked={config.notifyBrowser}
              onChange={v => update('notifyBrowser', v)}
            />
          </div>
        </Card>

        {/* Language & Region */}
        <Card icon={<Globe size={15} className="text-[#e9c176]" />} title={t('settings.languageAndRegion')}>
          <Label>{t('settings.languageAndRegionDesc')}</Label>
          <div className="mt-3">
            <SelectInput
              value={config.language}
              onChange={v => update('language', v as LanguageCode)}
              options={LANGUAGES.map(l => ({ value: l.code, label: l.label }))}
              isString
            />
          </div>
        </Card>

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold uppercase tracking-widest text-[11px] transition-all active:scale-[0.98] shadow-xl shadow-[#722f37]/20 border border-[#722f37]"
          style={{ background: saved ? 'rgba(34,197,94,0.15)' : '#722f37' }}
        >
          {saved ? (
            <><Check size={14} className="text-green-400" /><span className="text-green-400">{t('settings.saved')}</span></>
          ) : (
            <><Save size={14} /><span className="text-white">{t('settings.saveChanges')}</span></>
          )}
        </button>

      </div>
    </PageLayout>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#722f37]/25 bg-[#0B0B0C]">
      <div className="px-5 py-4 border-b border-white/[0.04] bg-gradient-to-r from-[#722f37]/10 to-transparent flex items-center gap-2.5">
        {icon}
        <h3 className="text-white font-serif text-sm tracking-wide">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-gray-600 leading-relaxed">{children}</p>;
}

function SelectInput({ value, onChange, options, isString }: {
  value: number | string;
  onChange: (v: any) => void;
  options: { value: number | string; label: string }[];
  isString?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(isString ? e.target.value : Number(e.target.value))}
        className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] text-white text-sm rounded-xl px-4 py-3 pr-10 outline-none focus:border-[#722f37]/60 transition-colors cursor-pointer"
      >
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-[#111]">{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-all"
    >
      <div className="flex-1 pr-4">
        <p className="text-sm text-white font-medium leading-tight">{label}</p>
        <p className="text-[11px] text-gray-600 mt-0.5">{description}</p>
      </div>
      <div className={`w-10 h-[22px] rounded-full transition-all flex-shrink-0 relative ${checked ? 'bg-[#722f37]' : 'bg-white/10'}`}>
        <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${checked ? 'left-[22px]' : 'left-[3px]'}`} />
      </div>
    </div>
  );
}
