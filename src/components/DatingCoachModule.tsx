import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Camera,
  Check,
  CheckCircle2,
  FileText,
  ImagePlus,
  Lightbulb,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Video,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type {
  DatingCoachAdvice,
  DatingCoachRequestPayload,
  EducationLevel,
  RelationshipGoal,
} from '../types';
import { SafeImage } from './CommonUI';

interface DatingCoachModuleProps {
  name: string;
  age: number;
  city: string;
  occupation: string;
  education: EducationLevel;
  relationshipGoal: RelationshipGoal;
  bio: string;
  interests: string[];
  photos: string[];
  verified: boolean;
  hasVideoIntro: boolean;
  onApplyBio: (nextBio: string) => void;
  onMakePrimaryPhoto: (idx: number) => void;
  onTriggerPhotoUpload: () => void;
  onScrollToBio: () => void;
  onScrollToGallery: () => void;
  onOpenVerificationModal: () => void;
  onOpenVideoIntroModal: () => void;
  onRequestDatingCoach: (
    payload: DatingCoachRequestPayload
  ) => Promise<{
    ok: boolean;
    advice?: DatingCoachAdvice;
    error?: string;
  }>;
}

type CoachTab = 'overview' | 'bio' | 'photos';

const CLICHE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /elsker å le/i, label: '«elsker å le»' },
  { pattern: /spør hvis du lurer/i, label: '«spør hvis du lurer»' },
  { pattern: /dårlig på å skrive om meg selv/i, label: '«dårlig på å skrive om meg selv»' },
  { pattern: /partner in crime/i, label: '«partner in crime»' },
  { pattern: /lever livet/i, label: '«lever livet»' },
  { pattern: /alt og ingenting/i, label: '«alt og ingenting»' },
];

const HOOKS_BY_INTEREST: Record<string, string> = {
  'mat & kaffe':
    'Hvilket sted i byen lager egentlig den beste kaffen akkurat nå?',
  friluftsliv:
    'Søndagstur i skogen med termos eller rolig formiddag i solen?',
  'kunst & design':
    'Hva er det mest inspirerende du har sett eller laget i det siste?',
  reiser:
    'Hvis vi kunne reist hvor som helst neste fredag etter jobb, hvor drar vi?',
  musikk:
    'Hvilken låt eller konsertopplevelse går du aldri lei av?',
  sport:
    'Liker du best en aktiv økt utendørs eller en rolig helgeformiddag?',
  litteratur:
    'Hvilken bok har blitt sittende lengst i tankene dine i år?',
  foto:
    'Liker du best gyllen kveldssol i byen eller utsikt fra høyden?',
};

function buildInterestHooks(interests: string[], city: string): string[] {
  const results: string[] = [];
  for (const item of interests) {
    const mapped = HOOKS_BY_INTEREST[item.trim().toLowerCase()];
    if (mapped && !results.includes(mapped)) {
      results.push(mapped);
    }
  }
  const fallbacks = [
    `Hva er din perfekte søndag i ${city || 'byen'}?`,
    'Kaffe i solen på formiddagen eller lang middag på kvelden?',
    'Hva gleder du deg aller mest til denne måneden?',
  ];
  for (const fb of fallbacks) {
    if (results.length >= 3) break;
    if (!results.includes(fb)) {
      results.push(fb);
    }
  }
  return results.slice(0, 3);
}

function getGoalToneGuidance(goal: RelationshipGoal): string {
  switch (goal) {
    case 'Seriøst forhold':
      return 'Du søker et seriøst forhold: kombiner varme hverdagsbilder i teksten med hva du verdsetter i en partner, uten å lage en lang kravliste.';
    case 'Turvenn & bekjentskap':
      return 'Du søker turvenn og bekjentskap: nevn konkrete turmål, tempo eller aktiviteter du har lyst til å gjøre sammen den nærmeste måneden.';
    case 'Åpen for det meste':
    default:
      return 'Du er åpen for det meste: hold tonen lett, nysgjerrig og personlig, og foreslå en lavterskel første date som kaffe eller rusletur.';
  }
}

export const DatingCoachModule: React.FC<DatingCoachModuleProps> = ({
  name,
  age,
  city,
  occupation,
  education,
  relationshipGoal,
  bio,
  interests,
  photos,
  verified,
  hasVideoIntro,
  onApplyBio,
  onMakePrimaryPhoto,
  onTriggerPhotoUpload,
  onScrollToBio,
  onScrollToGallery,
  onOpenVerificationModal,
  onOpenVideoIntroModal,
  onRequestDatingCoach,
}) => {
  const prefersReducedMotion = Boolean(useReducedMotion());

  const [activeTab, setActiveTab] = useState<CoachTab>('overview');
  const [coachAdvice, setCoachAdvice] = useState<DatingCoachAdvice | null>(
    null
  );
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [previousBioBeforeCoach, setPreviousBioBeforeCoach] = useState<
    string | null
  >(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const trimmedBio = bio.trim();
  const bioCharCount = trimmedBio.length;

  // 1. Live Best-Practice Rubric Evaluation (updates 0ms as user types or edits photos)
  const detectedCliches = useMemo(
    () =>
      CLICHE_PATTERNS.filter((entry) => entry.pattern.test(trimmedBio)).map(
        (entry) => entry.label
      ),
    [trimmedBio]
  );

  const bioLengthOptimal = bioCharCount >= 110 && bioCharCount <= 300;
  const bioLengthAcceptable = bioCharCount >= 75 && bioCharCount <= 360;

  const hasConcreteSpecifics = useMemo(() => {
    if (bioCharCount < 55) return false;
    const words = trimmedBio.split(/\s+/).filter(Boolean);
    const mentionsInterestOrPlace =
      interests.some((intItem) =>
        intItem
          .toLowerCase()
          .split(/\s+|&/)
          .filter((token) => token.length >= 4)
          .some((token) => trimmedBio.toLowerCase().includes(token))
      ) ||
      (city.trim().length >= 3 &&
        trimmedBio.toLowerCase().includes(city.trim().toLowerCase())) ||
      words.length >= 16;
    return mentionsInterestOrPlace && detectedCliches.length === 0;
  }, [bioCharCount, city, detectedCliches.length, interests, trimmedBio]);

  const hasConversationHook = useMemo(() => {
    if (!trimmedBio) return false;
    return (
      trimmedBio.includes('?') ||
      /\b(eller|anbefal|tips til|utfordrer deg|si gjerne ifra)\b/i.test(
        trimmedBio
      )
    );
  }, [trimmedBio]);

  const hasRecommendedPhotoCount = photos.length >= 4;
  const hasPrimaryPhoto = photos.length >= 1;
  const customUploadedCount = useMemo(
    () => photos.filter((src) => src.startsWith('data:image/')).length,
    [photos]
  );
  const hasTrustSignals = verified || hasVideoIntro;

  // Transparent 0–100 Best-Practice Score (50 pts Bio + 50 pts Photos/Trust)
  const bioScore = useMemo(() => {
    let pts = 0;
    if (bioLengthOptimal) pts += 20;
    else if (bioLengthAcceptable) pts += 12;
    else if (bioCharCount > 0) pts += 5;

    if (hasConcreteSpecifics) pts += 16;
    else if (bioCharCount >= 40 && detectedCliches.length === 0) pts += 9;

    if (hasConversationHook) pts += 14;
    return Math.min(50, pts);
  }, [
    bioCharCount,
    bioLengthAcceptable,
    bioLengthOptimal,
    detectedCliches.length,
    hasConcreteSpecifics,
    hasConversationHook,
  ]);

  const photoScore = useMemo(() => {
    let pts = 0;
    if (photos.length >= 4) pts += 28;
    else if (photos.length === 3) pts += 21;
    else if (photos.length === 2) pts += 14;
    else if (photos.length === 1) pts += 7;

    if (photos.length >= 3) pts += 12;
    else if (photos.length === 2) pts += 7;

    if (verified) pts += 5;
    if (hasVideoIntro) pts += 5;
    return Math.min(50, pts);
  }, [hasVideoIntro, photos.length, verified]);

  const totalBestPracticeScore = bioScore + photoScore;

  const tailoredHooks = useMemo(
    () => buildInterestHooks(interests, city),
    [city, interests]
  );

  const primaryInterestLabel = interests[0] || 'friluftsliv eller matlaging';
  const secondaryInterestLabel = interests[1] || 'kaffe med venner';

  const photoSlotBlueprint = useMemo(
    () => [
      {
        slotNumber: 1,
        title: 'Hovedportrett i naturlig dagslys',
        bestPractice:
          'Klart utsnitt fra brystet og opp, varmt smil og direkte blikkontakt inn i kamera — uten solbriller, caps eller andre personer.',
        photoSrc: photos[0] || null,
      },
      {
        slotNumber: 2,
        title: 'Helfigur i naturlige omgivelser',
        bestPractice: `Vis stil og kroppsspråk utendørs i ${
          city || 'byen'
        } eller på tur, slik at matchen får et helhetlig og ekte inntrykk.`,
        photoSrc: photos[1] || null,
      },
      {
        slotNumber: 3,
        title: `Interesse i aksjon (${primaryInterestLabel.toLowerCase()})`,
        bestPractice: `Et bilde der du faktisk holder på med ${primaryInterestLabel.toLowerCase()} fungerer som en visuell samtalestarter helt av seg selv.`,
        photoSrc: photos[2] || null,
      },
      {
        slotNumber: 4,
        title: 'Uoppstilt øyeblikksbilde med sosial varme',
        bestPractice: `Et blinkskudd tatt av en venn (f.eks. knyttet til ${secondaryInterestLabel.toLowerCase()} eller reise) bygger tillit og sjarm.`,
        photoSrc: photos[3] || null,
      },
    ],
    [city, photos, primaryInterestLabel, secondaryInterestLabel]
  );

  const handleRunAiCoach = async () => {
    setCoachLoading(true);
    setCoachError(null);
    const result = await onRequestDatingCoach({
      name: name.trim() || 'Bruker',
      age: Math.min(99, Math.max(18, Number(age) || 25)),
      city: city.trim() || 'Oslo',
      occupation: occupation.trim(),
      education,
      relationshipGoal,
      bio: trimmedBio,
      interests,
      photos,
      verified,
      hasVideoIntro,
    });
    setCoachLoading(false);

    if (result.ok && result.advice) {
      setCoachAdvice(result.advice);
    } else {
      setCoachError(
        result.error || 'Kunne ikke hente råd fra Dating-coach akkurat nå.'
      );
    }
  };

  const handleApplyBioText = (nextText: string, label: string) => {
    const cleanNext = nextText.trim().slice(0, 400);
    if (!cleanNext || cleanNext === trimmedBio) return;
    setPreviousBioBeforeCoach(bio);
    onApplyBio(cleanNext);
    setStatusFeedback(
      `${label} er satt inn i biografifeltet — trykk «Lagre endringer» i skjemaet for å publisere.`
    );
  };

  const handleAppendHook = (hookQuestion: string) => {
    if (trimmedBio.includes(hookQuestion)) return;
    const separator =
      trimmedBio.length === 0
        ? ''
        : /[.!?]$/.test(trimmedBio)
          ? ' '
          : '. ';
    const combined = `${trimmedBio}${separator}${hookQuestion}`.slice(0, 400);
    setPreviousBioBeforeCoach(bio);
    onApplyBio(combined);
    setStatusFeedback(
      'Samtalekrok lagt til på slutten av biografien — husk å lagre endringene dine.'
    );
  };

  const handleUndoBioChange = () => {
    if (previousBioBeforeCoach === null) return;
    onApplyBio(previousBioBeforeCoach);
    setPreviousBioBeforeCoach(null);
    setStatusFeedback('Tilbakestilte til din forrige biografi.');
  };

  const resolvedVariants = useMemo(() => {
    if (!coachAdvice) return [];
    if (
      Array.isArray(coachAdvice.bioVariants) &&
      coachAdvice.bioVariants.length > 0
    ) {
      return coachAdvice.bioVariants;
    }
    if (coachAdvice.suggestedBio) {
      return [{ tone: 'Anbefalt forslag', text: coachAdvice.suggestedBio }];
    }
    return [];
  }, [coachAdvice]);

  return (
    <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 shadow-xs space-y-5">
      {/* Header Row: Title, Description & Primary AI Action */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <Lightbulb className="w-5 h-5 mt-0.5 text-rose-600 dark:text-rose-400 shrink-0" />
          <div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Dating-coach
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
              Konstruktive råd for biografi og profilbilder basert på beste praksis for dating-apper — oppdateres direkte mens du redigerer.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={coachLoading}
          onClick={() => void handleRunAiCoach()}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-60 text-white dark:text-zinc-900 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition whitespace-nowrap shrink-0"
        >
          {coachLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Analyserer profil og bilder...</span>
            </>
          ) : coachAdvice ? (
            <>
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span>Oppdater AI-vurdering</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Få personlig AI-vurdering</span>
            </>
          )}
        </button>
      </div>

      {/* Live Best-Practice Score Bar */}
      <div className="py-3.5 border-y border-zinc-100 dark:border-zinc-800 space-y-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Beste-praksis-score
            </span>
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">
              {totalBestPracticeScore}/100
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            <span>Biografi {bioScore}/50</span>
            <span aria-hidden="true">·</span>
            <span>Bilder og tillit {photoScore}/50</span>
          </div>
        </div>

        <div
          role="progressbar"
          aria-label="Profilens beste-praksis-score"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={totalBestPracticeScore}
          className="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex"
        >
          <motion.div
            initial={false}
            animate={{ scaleX: totalBestPracticeScore / 100 }}
            style={{ width: '100%', transformOrigin: 'left' }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
            }
            className={`h-full ${
              totalBestPracticeScore >= 80
                ? 'bg-emerald-600 dark:bg-emerald-500'
                : 'bg-rose-600 dark:bg-rose-500'
            }`}
          />
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
          {totalBestPracticeScore >= 85
            ? 'Profilen følger nøkkelprinsippene for høyt engasjement: personlig bio med samtalekrok og variert bildegalleri.'
            : !hasRecommendedPhotoCount && !hasConversationHook
              ? `Største løft akkurat nå: legg til en åpen samtalekrok i bioen og utvid bildegalleriet fra ${photos.length} til minst 4 varierte bilder.`
              : !hasRecommendedPhotoCount
                ? `Bioen har et godt grunnlag — du henter mest på å øke bildegalleriet fra ${photos.length} til 4–6 varierte bilder som speiler interessene dine.`
                : !hasConversationHook
                  ? 'Bildene er på god vei — avslutt gjerne biografien med et konkret spørsmål så matchen enkelt kan starte praten.'
                  : 'Solid helhet! Finjuster gjerne spesifikke detaljer i bioen eller bruk AI-vurderingen for skreddersydde forslag.'}
        </p>
      </div>

      {/* Loading Progress Notice when Gemini Multimodal Coaching is Running */}
      <AnimatePresence initial={false}>
        {coachLoading && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            role="status"
            className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700 px-4 py-3 flex items-center gap-3"
          >
            <Loader2 className="w-4 h-4 text-rose-600 dark:text-rose-400 animate-spin shrink-0" />
            <p className="text-xs text-zinc-700 dark:text-zinc-200 leading-relaxed">
              Vurderer biografien din ({bioCharCount} tegn) og bildegalleriet ({photos.length}{' '}
              {photos.length === 1 ? 'bilde' : 'bilder'}) opp mot beste praksis for dating-apper...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline Error Banner */}
      <AnimatePresence initial={false}>
        {coachError && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            role="alert"
            className="rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 px-4 py-3 flex items-start justify-between gap-3"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                {coachError}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCoachError(null)}
              className="min-h-[36px] min-w-[36px] -my-1 -mr-1 flex items-center justify-center text-amber-700 dark:text-amber-300 hover:text-amber-950 dark:hover:text-white shrink-0"
              aria-label="Lukk feilmelding"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Applied Bio / Undo Feedback Strip */}
      <AnimatePresence initial={false}>
        {statusFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            role="status"
            className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/45 border border-emerald-200 dark:border-emerald-800/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200 leading-snug">
                {statusFeedback}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {previousBioBeforeCoach !== null && (
                <button
                  type="button"
                  onClick={handleUndoBioChange}
                  className="min-h-[36px] px-3 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-700 text-xs font-semibold text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/60 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 transition whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Angre</span>
                </button>
              )}
              <button
                type="button"
                onClick={onScrollToBio}
                className="min-h-[36px] px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1 transition whitespace-nowrap"
              >
                <span>Se biografifelt</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setStatusFeedback(null)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-emerald-700 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white"
                aria-label="Lukk bekreftelse"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Segmented Navigation: Oversikt · Biografi · Profilbilder */}
      <div
        role="tablist"
        aria-label="Kategorier i Dating-coach"
        className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800"
      >
        {(
          [
            { id: 'overview' as const, label: 'Oversikt', icon: Sparkles },
            {
              id: 'bio' as const,
              label: `Biografi (${bioCharCount})`,
              icon: FileText,
            },
            {
              id: 'photos' as const,
              label: `Profilbilder (${photos.length}/6)`,
              icon: Camera,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[42px] px-2.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition tabular-nums whitespace-nowrap ${
                active
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERSIKT (HELHETSVURDERING + INTERAKTIV SJEKKLISTE) */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {coachAdvice && (
            <div className="rounded-2xl bg-rose-50/50 dark:bg-rose-950/25 border border-rose-200/70 dark:border-rose-900/60 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
                  Personlig AI-vurdering for {name || 'deg'}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                  Kl. {coachAdvice.generatedAt}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-100 leading-relaxed">
                {coachAdvice.summary}
              </p>

              <div className="pt-2 border-t border-rose-200/50 dark:border-rose-900/50 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                <div>
                  <strong className="font-semibold text-zinc-900 dark:text-zinc-100 block mb-0.5">
                    Styrke i biografien
                  </strong>
                  <span>{coachAdvice.bioStrengths}</span>
                </div>
                {coachAdvice.photoStrengths && (
                  <div>
                    <strong className="font-semibold text-zinc-900 dark:text-zinc-100 block mb-0.5">
                      Styrke i profilbildene
                    </strong>
                    <span>{coachAdvice.photoStrengths}</span>
                  </div>
                )}
              </div>

              <div className="pt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('bio')}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-800/80 text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-rose-50 dark:hover:bg-zinc-800 transition whitespace-nowrap"
                >
                  Se {resolvedVariants.length} bio-forslag og {coachAdvice.bioTips.length} råd →
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('photos')}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-800/80 text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-rose-50 dark:hover:bg-zinc-800 transition whitespace-nowrap"
                >
                  Se bildeplan og {coachAdvice.photoTips.length} bilderåd →
                </button>
              </div>
            </div>
          )}

          {/* Live 6-Point Best-Practice Checklist */}
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/90 border-t border-zinc-100 dark:border-zinc-800">
            {/* Check 1: Bio Length */}
            <div className="py-3.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    bioLengthOptimal
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Biolengde i treffsonen (110–300 tegn)
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {bioCharCount === 0
                      ? 'Biografien er tom — profiler med 2–3 konkrete setninger får langt flere svar enn tomme profiler.'
                      : bioCharCount < 110
                        ? `Nåværende lengde er ${bioCharCount} tegn. Utvid gjerne med én konkret detalj om hva en fin helg inneholder for deg.`
                        : bioCharCount <= 300
                          ? `Ideell lengde (${bioCharCount} tegn) — lettlest på mobil og innholdsrik nok til å vekke nysgjerrighet.`
                          : `Bioen er på ${bioCharCount} tegn. Kort gjerne litt ned så poengene dine treffer raskt på mobil.`}
                  </p>
                </div>
              </div>
              {!bioLengthOptimal && (
                <button
                  type="button"
                  onClick={() => setActiveTab('bio')}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition whitespace-nowrap shrink-0"
                >
                  Forbedre
                </button>
              )}
            </div>

            {/* Check 2: Specifics & Zero Clichés */}
            <div className="py-3.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    hasConcreteSpecifics
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    «Vis, ikke bare fortell» uten klisjeer
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {detectedCliches.length > 0
                      ? `Unngå generelle uttrykk som ${detectedCliches.join(
                          ', '
                        )} — bytt dem ut med en spesifikk situasjon som viser humoren eller hverdagen din.`
                      : hasConcreteSpecifics
                        ? 'Bra! Teksten bruker konkrete hverdagsbilder uten typiske dating-klisjeer.'
                        : `Koble gjerne inn et konkret bilde fra interessene dine (${primaryInterestLabel.toLowerCase()}) fremfor generelle adjektiver.`}
                  </p>
                </div>
              </div>
              {!hasConcreteSpecifics && (
                <button
                  type="button"
                  onClick={onScrollToBio}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition whitespace-nowrap shrink-0"
                >
                  Rediger bio
                </button>
              )}
            </div>

            {/* Check 3: Conversation Hook */}
            <div className="py-3.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    hasConversationHook
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Naturlig samtalekrok til slutt
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {hasConversationHook
                      ? 'Bioen din inneholder en tydelig krok som gjør det enkelt for matcher å sende første melding.'
                      : 'Avslutt bioen med et lett spørsmål eller enten/eller-valg — det senker terskelen for at noen tar kontakt.'}
                  </p>
                </div>
              </div>
              {!hasConversationHook && (
                <button
                  type="button"
                  onClick={() => setActiveTab('bio')}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition whitespace-nowrap shrink-0"
                >
                  Velg krok
                </button>
              )}
            </div>

            {/* Check 4: Photo Count & Variety */}
            <div className="py-3.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    hasRecommendedPhotoCount
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Variert bildegalleri (anbefalt 4–6 bilder)
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {hasRecommendedPhotoCount
                      ? `Du har ${photos.length} av 6 profilbilder${
                          customUploadedCount > 0
                            ? ` (inkludert ${customUploadedCount} egne opplastninger)`
                            : ''
                        } — god bredde mellom portrett og hverdag.`
                      : `Du har ${photos.length} av 6 bilder nå. Legg til ${
                          4 - photos.length
                        } ${
                          4 - photos.length === 1 ? 'bilde' : 'bilder'
                        } til (helfigur, aktivitet og sosialt øyeblikk) for merkbart høyere matchrate.`}
                  </p>
                </div>
              </div>
              {!hasRecommendedPhotoCount && (
                <button
                  type="button"
                  onClick={onTriggerPhotoUpload}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 transition whitespace-nowrap shrink-0"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>Last opp</span>
                </button>
              )}
            </div>

            {/* Check 5: Primary Photo Best Practice */}
            <div className="py-3.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    hasPrimaryPhoto
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Førsteinntrykk på hovedbilde (bilde 1)
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    Beste praksis for bilde 1: varmt smil, mykt dagslys, rolig bakgrunn og direkte blikkontakt i kamera — uten solbriller eller andre personer.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('photos')}
                className="min-h-[38px] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition whitespace-nowrap shrink-0"
              >
                Sjekk bilder
              </button>
            </div>

            {/* Check 6: Authenticity & Trust Signals */}
            <div className="pt-3.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    hasTrustSignals
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Ekthet og tillit (verifisering og video-intro)
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {verified && hasVideoIntro
                      ? 'Både selfie-verifisering og 15-sekunders video-intro er på plass — dette gir maksimal tillit.'
                      : verified
                        ? 'Profilen er selfie-verifisert! En kort 15s video-intro gir i tillegg stemme og personlighet utover stillbilder.'
                        : 'En rask selfie-verifisering bekrefter at bildene tilhører deg og øker svarprosenten betydelig.'}
                  </p>
                </div>
              </div>
              {!verified ? (
                <button
                  type="button"
                  onClick={onOpenVerificationModal}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 transition whitespace-nowrap shrink-0"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Verifiser</span>
                </button>
              ) : !hasVideoIntro ? (
                <button
                  type="button"
                  onClick={onOpenVideoIntroModal}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 transition whitespace-nowrap shrink-0"
                >
                  <Video className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>15s video</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BIOGRAFI-COACH */}
      {activeTab === 'bio' && (
        <div className="space-y-5">
          {/* Tone & Goal Alignment Advice */}
          <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Tilpasset ditt mål: {relationshipGoal}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                Nåværende lengde: {bioCharCount}/400 tegn
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {getGoalToneGuidance(relationshipGoal)}
            </p>
            {detectedCliches.length > 0 && (
              <p className="text-xs text-amber-800 dark:text-amber-300 pt-1">
                Tips: Erstatt gjerne klisjeen {detectedCliches.join(', ')} med et konkret øyeblikk fra uken din.
              </p>
            )}
          </div>

          {/* Personalized AI Bio Tips & Variants (if loaded) or Prompt */}
          {coachAdvice ? (
            <div className="space-y-4">
              <div className="space-y-2.5">
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Konkrete forbedringsråd for bioen din
                </h3>
                <ol className="space-y-2.5">
                  {coachAdvice.bioTips.map((tip, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed"
                    >
                      <span className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                        {idx + 1}
                      </span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {resolvedVariants.length > 0 && (
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50">
                      Skreddersydde forslag du kan teste direkte
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Basert på dine interesser ({interests.slice(0, 3).join(', ') || 'profilen din'}) og hva du ser etter
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {resolvedVariants.map((variant, idx) => {
                      const isCurrentlyApplied = trimmedBio === variant.text.trim();
                      return (
                        <div
                          key={`${variant.tone}-${idx}`}
                          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              Stil {idx + 1}: {variant.tone}
                            </span>
                            <button
                              type="button"
                              disabled={isCurrentlyApplied}
                              onClick={() =>
                                handleApplyBioText(
                                  variant.text,
                                  `Forslag (${variant.tone.toLowerCase()})`
                                )
                              }
                              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition whitespace-nowrap ${
                                isCurrentlyApplied
                                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-rose-600 hover:bg-rose-700 text-white'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {isCurrentlyApplied ? 'I bruk nå' : 'Bruk i bio'}
                              </span>
                            </button>
                          </div>
                          <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            «{variant.text}»
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Vil du ha 2 ferdigskrevne bio-forslag og 3 spissede tilbakemeldinger på teksten din? Kjør en personlig AI-vurdering.
              </p>
              <button
                type="button"
                disabled={coachLoading}
                onClick={() => void handleRunAiCoach()}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generer bio-forslag</span>
              </button>
            </div>
          )}

          {/* One-Click Conversation Hook Builder Based on User Interests */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Legg til en samtalekrok på slutten av bioen
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Beste praksis: avslutt bioen med et konkret spørsmål knyttet til interessene dine
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {tailoredHooks.map((hookText, idx) => {
                const alreadyIncluded = trimmedBio.includes(hookText);
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={alreadyIncluded}
                    onClick={() => handleAppendHook(hookText)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-800 bg-zinc-50/70 dark:bg-zinc-800/50 hover:bg-rose-50/40 dark:hover:bg-rose-950/20 disabled:opacity-55 text-left flex items-center justify-between gap-3 transition"
                  >
                    <span className="text-xs text-zinc-800 dark:text-zinc-200 leading-snug">
                      «{hookText}»
                    </span>
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap shrink-0">
                      {alreadyIncluded ? 'Lagt til' : '+ Legg til'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROFILBILDER-COACH */}
      {activeTab === 'photos' && (
        <div className="space-y-5">
          {coachAdvice && (
            <div className="space-y-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              {coachAdvice.photoStrengths && (
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Visuell styrke nå:{' '}
                  </strong>
                  {coachAdvice.photoStrengths}
                </p>
              )}

              <div className="space-y-2">
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Personlige råd for bildegalleriet ditt
                </h3>
                <ol className="space-y-2.5">
                  {coachAdvice.photoTips.map((tip, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed"
                    >
                      <span className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                        {idx + 1}
                      </span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {coachAdvice.nextPhotoIdea && (
                <div className="rounded-2xl bg-rose-50/50 dark:bg-rose-950/25 border border-rose-200/70 dark:border-rose-900/60 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                    <strong className="font-semibold text-rose-800 dark:text-rose-300">
                      Anbefalt neste bilde å ta:{' '}
                    </strong>
                    {coachAdvice.nextPhotoIdea}
                  </p>
                  {photos.length < 6 && (
                    <button
                      type="button"
                      onClick={onTriggerPhotoUpload}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      <span>Last opp bilde</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Best-Practice Slot-by-Slot Blueprint Mapped to Current Photos */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Anbefalt bilderekkefølge etter beste praksis
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Slik bygger du en bildeserie som skaper trygghet, viser personlighet og gir flere matcher
                </p>
              </div>

              <button
                type="button"
                onClick={onScrollToGallery}
                className="min-h-[38px] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-flex items-center gap-1 transition whitespace-nowrap shrink-0"
              >
                <span>Gå til galleri</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border-t border-zinc-100 dark:border-zinc-800">
              {photoSlotBlueprint.map((slot, idx) => (
                <div
                  key={slot.slotNumber}
                  className="py-3.5 flex items-center justify-between gap-3.5"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {slot.photoSrc ? (
                      <div className="w-12 h-16 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0">
                        <SafeImage
                          src={slot.photoSrc}
                          alt={`Plass ${slot.slotNumber}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={onTriggerPhotoUpload}
                        className="w-12 h-16 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-rose-500 bg-zinc-50 dark:bg-zinc-800/60 flex flex-col items-center justify-center text-zinc-400 hover:text-rose-600 transition shrink-0"
                        aria-label={`Last opp bilde til plass ${slot.slotNumber}`}
                      >
                        <ImagePlus className="w-4 h-4" />
                        <span className="text-[10px] font-semibold tabular-nums mt-0.5">
                          #{slot.slotNumber}
                        </span>
                      </button>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                          Bilde {slot.slotNumber} · {slot.title}
                        </span>
                        {idx === 0 && slot.photoSrc && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            <Star className="w-3 h-3" fill="currentColor" />
                            <span>Hovedbilde</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                        {slot.bestPractice}
                      </p>
                    </div>
                  </div>

                  {slot.photoSrc ? (
                    idx > 0 ? (
                      <button
                        type="button"
                        onClick={() => onMakePrimaryPhoto(idx)}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition whitespace-nowrap shrink-0"
                      >
                        Sett først
                      </button>
                    ) : null
                  ) : (
                    <button
                      type="button"
                      onClick={onTriggerPhotoUpload}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800/80 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100/70 dark:hover:bg-rose-950/50 text-xs font-semibold text-rose-700 dark:text-rose-300 inline-flex items-center gap-1.5 transition whitespace-nowrap shrink-0"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      <span>Legg til</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Golden Rules Summary Footer */}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800 leading-relaxed">
              Unngå vanlige bildefeller: gruppebilde som første bilde, mørke speil-selfies på badet, tunge filtre eller kun bilder med solbriller som skjuler øynene.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
