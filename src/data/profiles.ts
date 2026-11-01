import ingridImg from '../assets/images/profile_ingrid_oslo_1793259749229.jpg';
import henrikImg from '../assets/images/profile_henrik_bergen_1793259750634.jpg';
import noraImg from '../assets/images/profile_nora_trondheim_1793259751943.jpg';
import kasperImg from '../assets/images/profile_kasper_tromso_1793259752912.jpg';
import sofieImg from '../assets/images/profile_sofie_stavanger_1793259755190.jpg';
import emilImg from '../assets/images/profile_emil_oslo_1793259754768.jpg';
import astridImg from '../assets/images/profile_astrid_bergen_1793260551683.jpg';
import sanderImg from '../assets/images/profile_sander_trondheim_1793260551722.jpg';
import userMajaMainImg from '../assets/images/user_maja_main_1793260548621.jpg';
import userMajaGalleryImg from '../assets/images/user_maja_gallery_1793260549336.jpg';
import type {
  DatingProfile,
  EducationLevel,
  RelationshipGoal,
} from '../types';

export const DEFAULT_USER_PHOTOS: string[] = [
  userMajaMainImg,
  userMajaGalleryImg,
];

export const INTEREST_OPTIONS: string[] = [
  'Sport',
  'Musikk',
  'Reiser',
  'Friluftsliv',
  'Mat & kaffe',
  'Kunst & design',
  'Litteratur',
  'Foto',
];

export const EDUCATION_OPTIONS: EducationLevel[] = [
  'Videregående / Fagbrev',
  'Bachelorgrad',
  'Mastergrad',
];

export const RELATIONSHIP_GOAL_OPTIONS: RelationshipGoal[] = [
  'Seriøst forhold',
  'Åpen for det meste',
  'Turvenn & bekjentskap',
];

export const PROFILES: DatingProfile[] = [
  {
    id: 'henrik',
    name: 'Henrik',
    age: 29,
    city: 'Bergen',
    distanceKm: 3,
    occupation: 'Maritim ingeniør',
    education: 'Mastergrad',
    relationshipGoal: 'Seriøst forhold',
    verified: true,
    isOnline: true,
    isNew: true,
    lastActiveLabel: 'Aktiv nå',
    bio: 'Vokst opp ved sjøen og trives best med saltvann i håret eller en god kaffe på brygga. Lager gjerne fiskesuppe fra bunnen og sier aldri nei til en spontan helgetur.',
    interests: ['Sport', 'Musikk', 'Reiser', 'Friluftsliv'],
    prompts: [
      {
        question: 'En perfekt søndag for meg er',
        answer:
          'Formiddagstur opp Fløyen etterfulgt av kanelboller og nytraktet kaffe ved vannet.',
      },
      {
        question: 'Vi kommer garantert overens hvis',
        answer:
          'Du setter pris på tørr vestlandshumor og liker å oppdage små skjulte spisesteder.',
      },
    ],
    image: henrikImg,
    icebreakers: [
      'Ærlig spørsmål: regner det virkelig hver dag i Bergen, eller overdriver vi andre?',
      'Hva er din ultimate sjømatrett når du inviterer på middag?',
      'Seiltur langs kysten eller hyttehelg på fjellet?',
    ],
    readReceiptsEnabled: true,
    level: 3,
    levelTitle: 'Date-arkitekt',
    achievements: [
      {
        id: 'complete_profile',
        title: 'Komplett profil',
        description: 'Fullført bio, interesser og bilder',
        icon: 'profile',
      },
      {
        id: 'verified_star',
        title: 'Trygg & Verifisert',
        description: 'Bekreftet identitet med pose-selfie',
        icon: 'verified',
      },
      {
        id: 'daily_streak',
        title: '5-dagers Gnist-rekke',
        description: 'Logget inn og aktiv 5 dager på rad',
        icon: 'streak',
      },
    ],
  },
  {
    id: 'sofie',
    name: 'Sofie',
    age: 26,
    city: 'Stavanger',
    distanceKm: 2,
    occupation: 'Landskapsarkitekt',
    education: 'Mastergrad',
    relationshipGoal: 'Seriøst forhold',
    verified: true,
    isOnline: true,
    isNew: true,
    lastActiveLabel: 'Aktiv nå',
    bio: 'Tegner grønne byrom på dagtid og samler gode venner rundt langbord på kvelden. Svak for italiensk kokkekunst, varme sommerkvelder og folk som tør å by på seg selv.',
    interests: ['Kunst & design', 'Mat & kaffe', 'Reiser'],
    prompts: [
      {
        question: 'Veien til hjertet mitt går gjennom',
        answer:
          'Fersk hjemmelaget pasta, god olivenolje og en samtale som varer til stengetid.',
      },
      {
        question: 'Mitt beste reisetips',
        answer:
          'Dropp hovedgatene og finn den lille bakgårdskafeen der naboene drikker espresso.',
      },
    ],
    image: sofieImg,
    icebreakers: [
      'Hjemmelaget pasta fra bunnen eller tapas i en solrik bakgård?',
      'Hva får deg alltid til å le så mye at du glemmer tiden?',
      'Hvis vi kunne reist hvor som helst neste fredag etter jobb, hvor drar vi?',
    ],
    readReceiptsEnabled: true,
    level: 4,
    levelTitle: 'Kjemimester',
    achievements: [
      {
        id: 'complete_profile',
        title: 'Komplett profil',
        description: 'Fullført bio, interesser og bilder',
        icon: 'profile',
      },
      {
        id: 'verified_star',
        title: 'Trygg & Verifisert',
        description: 'Bekreftet identitet med pose-selfie',
        icon: 'verified',
      },
      {
        id: 'icebreaker_sender',
        title: 'Isbryteren',
        description: 'Sendt personlige samtalestartere til matcher',
        icon: 'icebreaker',
      },
      {
        id: 'match_magnet',
        title: 'Match-magnet',
        description: 'Oppnådd 5+ gjensidige matcher',
        icon: 'match',
      },
    ],
  },
  {
    id: 'nora',
    name: 'Nora',
    age: 25,
    city: 'Trondheim',
    distanceKm: 5,
    occupation: 'Keramiker & illustratør',
    education: 'Bachelorgrad',
    relationshipGoal: 'Åpen for det meste',
    verified: true,
    isOnline: true,
    isNew: false,
    lastActiveLabel: 'Aktiv nå',
    bio: 'Tilbringer dagene med hendene i leire på Bakklandet. Har sannsynligvis litt for mange grønne planter hjemme og drømmer om en liten hage med drivhus.',
    interests: ['Kunst & design', 'Friluftsliv', 'Musikk'],
    prompts: [
      {
        question: 'Noe jeg brenner skikkelig for',
        answer:
          'Håndverk som varer lenge — og følelsen av å drikke morgenkaffe fra en kopp man har dreid selv.',
      },
      {
        question: 'En uventet fakta om meg',
        answer:
          'Jeg bader i fjorden hele året, også når det ligger snø på brygga.',
      },
    ],
    image: noraImg,
    icebreakers: [
      'Hva er det mest skjeve men sjarmerende du har dreid på keramikkverkstedet?',
      'Hvis vi bygger en spilleliste for en roadtrip, hvilke tre låter må med først?',
      'Grønne planter overalt i leiligheten — hvor mange har du egentlig nå?',
    ],
    readReceiptsEnabled: true,
    level: 3,
    levelTitle: 'Samtalestarter',
    achievements: [
      {
        id: 'complete_profile',
        title: 'Komplett profil',
        description: 'Fullført bio, interesser og bilder',
        icon: 'profile',
      },
      {
        id: 'verified_star',
        title: 'Trygg & Verifisert',
        description: 'Bekreftet identitet med pose-selfie',
        icon: 'verified',
      },
      {
        id: 'game_player',
        title: 'Spillmester',
        description: 'Spilt spørsmålsspill i samtaleloggen',
        icon: 'game',
      },
    ],
  },
  {
    id: 'kasper',
    name: 'Kasper',
    age: 31,
    city: 'Tromsø',
    distanceKm: 7,
    occupation: 'Fysioterapeut & fotograf',
    education: 'Bachelorgrad',
    relationshipGoal: 'Seriøst forhold',
    verified: true,
    isOnline: false,
    isNew: true,
    lastActiveLabel: 'Aktiv for 18 min siden',
    bio: 'Alltid med analogt kamera over skulderen når høstfargene treffer fjellene. Rolig type som liker bålkaffe, toppturer på ski og lange filmkvelder når stormen uler ute.',
    interests: ['Sport', 'Friluftsliv', 'Foto', 'Reiser'],
    prompts: [
      {
        question: 'Mitt favorittsted i Norge',
        answer:
          'En stille fjellrygg over fjorden rett før solen går ned i oktober.',
      },
      {
        question: 'Første date-forslag',
        answer:
          'Termos med kakao på en kort utsiktstur — lav terskel og null stress.',
      },
    ],
    image: kasperImg,
    icebreakers: [
      'Hvilken fjelltopp i Nord-Norge har gitt deg den råeste utsikten hittil?',
      'Bålkaffe under nordlyset eller midnattssol ved havet?',
      'Hva pakker du alltid med i sekken som turkameratene dine blir misunnelige på?',
    ],
    readReceiptsEnabled: false,
    level: 2,
    levelTitle: 'Samtalestarter',
    achievements: [
      {
        id: 'complete_profile',
        title: 'Komplett profil',
        description: 'Fullført bio, interesser og bilder',
        icon: 'profile',
      },
      {
        id: 'verified_star',
        title: 'Trygg & Verifisert',
        description: 'Bekreftet identitet med pose-selfie',
        icon: 'verified',
      },
    ],
  },
  {
    id: 'emil',
    name: 'Emil',
    age: 28,
    city: 'Oslo',
    distanceKm: 1,
    occupation: 'Lydprodusent',
    education: 'Videregående / Fagbrev',
    relationshipGoal: 'Åpen for det meste',
    verified: false,
    isOnline: true,
    isNew: true,
    lastActiveLabel: 'Aktiv nå',
    bio: 'Kaffeentusiast som veier bønnene på morgenen, men tar resten av dagen ganske på sparket. Glad i vinylplater, surdeigsbakst og gode samtaler rundt kjøkkenøya.',
    interests: ['Musikk', 'Mat & kaffe', 'Sport'],
    prompts: [
      {
        question: 'Min skjulte superkraft',
        answer:
          'Kan trylle frem en skikkelig god middag av nesten tomt kjøleskap.',
      },
      {
        question: 'Jeg ser etter noen som',
        answer:
          'Er nysgjerrig, varm og liker både rolige kvelder hjemme og små konserter i byen.',
      },
    ],
    image: emilImg,
    icebreakers: [
      'Du lager pour-over kaffe på morgenen — hvilke bønner sverger du til akkurat nå?',
      'Hva er signaturretten din når du vil imponere på kjøkkenet?',
      'Rolig vinylkveld hjemme eller intimkonsert på en liten scene i byen?',
    ],
    readReceiptsEnabled: false,
    level: 2,
    levelTitle: 'Samtalestarter',
    achievements: [
      {
        id: 'complete_profile',
        title: 'Komplett profil',
        description: 'Fullført bio, interesser og bilder',
        icon: 'profile',
      },
      {
        id: 'icebreaker_sender',
        title: 'Isbryteren',
        description: 'Sendt kreative samtalestartere',
        icon: 'icebreaker',
      },
    ],
  },
  {
    id: 'ingrid',
    name: 'Ingrid',
    age: 27,
    city: 'Oslo',
    distanceKm: 2,
    occupation: 'Bokredaktør',
    education: 'Mastergrad',
    relationshipGoal: 'Seriøst forhold',
    verified: true,
    isOnline: true,
    isNew: false,
    lastActiveLabel: 'Aktiv nå',
    bio: 'Leser manus på kafé hele uken og løper i Nordmarka i helgene. Setter pris på lune steder, ærlige svar og mennesker som får hverdagen til å føles litt lysere.',
    interests: ['Litteratur', 'Mat & kaffe', 'Sport', 'Friluftsliv'],
    prompts: [
      {
        question: 'Du finner meg som regel',
        answer:
          'Ved vindusplassen på en liten kaffebar med en halvlest roman og en varm cortado.',
      },
      {
        question: 'Det beste jeg vet på en fredag',
        answer:
          'Dele småretter med noen jeg liker godt og le av alt som skjedde i løpet av uka.',
      },
    ],
    image: ingridImg,
    icebreakers: [
      'Hvilken kafé i Oslo lager egentlig byens beste cortado?',
      'Søndagstur i Nordmarka med termos eller lang brunsj på Grünerløkka?',
      'Hva er den siste boka du leste som du fortsatt tenker på?',
    ],
    readReceiptsEnabled: true,
    level: 4,
    levelTitle: 'Kjemimester',
    achievements: [
      {
        id: 'complete_profile',
        title: 'Komplett profil',
        description: 'Fullført bio, interesser og bilder',
        icon: 'profile',
      },
      {
        id: 'verified_star',
        title: 'Trygg & Verifisert',
        description: 'Bekreftet identitet med pose-selfie',
        icon: 'verified',
      },
      {
        id: 'date_planner',
        title: 'Date-planlegger',
        description: 'Synkronisert kalender for enkel møteplanlegging',
        icon: 'calendar',
      },
      {
        id: 'match_magnet',
        title: 'Match-magnet',
        description: 'Oppnådd 3+ gjensidige matcher',
        icon: 'match',
      },
    ],
  },
  {
    id: 'astrid',
    name: 'Astrid',
    age: 24,
    city: 'Bergen',
    distanceKm: 4,
    occupation: 'Idrettsviter & løpetrener',
    education: 'Bachelorgrad',
    relationshipGoal: 'Turvenn & bekjentskap',
    verified: true,
    isOnline: true,
    isNew: true,
    lastActiveLabel: 'Aktiv nå',
    bio: 'Morgenfugl som elsker stier med utsikt, kalde bad og spontane togreiser gjennom Europa. Ser etter noen som blir med på både fjelløp og rolig pizzakveld etterpå.',
    interests: ['Sport', 'Reiser', 'Friluftsliv'],
    prompts: [
      {
        question: 'Drømmereisen min akkurat nå',
        answer:
          'Tog gjennom Alpene med løpesko i sekken og stopp i små fjellandsbyer.',
      },
      {
        question: 'Det beste med helgen',
        answer:
          'Langtur i fjellet etterfulgt av ferske rundstykker og kaffe i solveggen.',
      },
    ],
    image: astridImg,
    icebreakers: [
      'Asfaltløping langs vannet eller bratt sti opp på nærmeste fjelltopp?',
      'Hvilket land på togreisen gjennom Europa hadde den beste maten?',
      'Isbad i fjorden før frokost — ja eller absolutt nei?',
    ],
    readReceiptsEnabled: true,
    level: 3,
    levelTitle: 'Date-arkitekt',
    achievements: [
      {
        id: 'complete_profile',
        title: 'Komplett profil',
        description: 'Fullført bio, interesser og bilder',
        icon: 'profile',
      },
      {
        id: 'verified_star',
        title: 'Trygg & Verifisert',
        description: 'Bekreftet identitet med pose-selfie',
        icon: 'verified',
      },
      {
        id: 'daily_streak',
        title: 'Daglig Gnist',
        description: 'Aktiv streak i Gnist',
        icon: 'streak',
      },
    ],
  },
  {
    id: 'sander',
    name: 'Sander',
    age: 33,
    city: 'Trondheim',
    distanceKm: 9,
    occupation: 'Møbelsnekker & musiker',
    education: 'Videregående / Fagbrev',
    relationshipGoal: 'Seriøst forhold',
    verified: true,
    isOnline: false,
    isNew: false,
    lastActiveLabel: 'Aktiv for 35 min siden',
    bio: 'Bygger heltre-møbler på verkstedet om dagen og spiller akustisk gitar om kvelden. Glad i lange samtaler, god litteratur og roadtrips langs norskekysten.',
    interests: ['Musikk', 'Litteratur', 'Reiser', 'Kunst & design'],
    prompts: [
      {
        question: 'Låten jeg alltid plukker frem på gitaren',
        answer:
          'En rolig vise når kveldssola treffer stuevinduet og kaffen fortsatt er varm.',
      },
      {
        question: 'En perfekt helg for to',
        answer:
          'Kjøre kystriksveien uten fast timeplan og stoppe ved hvert eneste lokale bakeri.',
      },
    ],
    image: sanderImg,
    icebreakers: [
      'Hva er det fineste møbelet du har bygget fra bunnen av?',
      'Hvilken konsertopplevelse glemmer du aldri?',
      'Nordover eller sørover hvis vi kaster oss i bilen på fredag?',
    ],
    readReceiptsEnabled: true,
    level: 3,
    levelTitle: 'Date-arkitekt',
    achievements: [
      {
        id: 'complete_profile',
        title: 'Komplett profil',
        description: 'Fullført bio, interesser og bilder',
        icon: 'profile',
      },
      {
        id: 'verified_star',
        title: 'Trygg & Verifisert',
        description: 'Bekreftet identitet med pose-selfie',
        icon: 'verified',
      },
      {
        id: 'icebreaker_sender',
        title: 'Isbryteren',
        description: 'Sendt personlige samtalestartere',
        icon: 'icebreaker',
      },
    ],
  },
];

export const PROFILE_MAP: Record<string, DatingProfile> = Object.fromEntries(
  PROFILES.map((p) => [p.id, p])
);

export const VERIFICATION_POSES = [
  {
    id: 'peace',
    title: 'Fredstegn ved ansiktet',
    instruction:
      'Hold opp to fingre i et V-tegn i hodehøyde og smil naturlig mot kameraet.',
    gestureLabel: 'V-tegn + smil',
  },
  {
    id: 'wave',
    title: 'Åpen hånd ved skulderen',
    instruction:
      'Løft høyre hånd i en vennlig hilsen ved skulderen med hele ansiktet i rammen.',
    gestureLabel: 'Vink i skulderhøyde',
  },
  {
    id: 'thumbsup',
    title: 'Tommel opp foran brystet',
    instruction:
      'Vis en tydelig tommel opp rett under haken slik at både hånd og ansikt synes.',
    gestureLabel: 'Tommel opp',
  },
];
