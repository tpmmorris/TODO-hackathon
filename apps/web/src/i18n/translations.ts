export type Language = 'en' | 'cy' | 'pl';

export interface LanguageOption {
  code: Language;
  label: string;
}

export const languageOptions: LanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'cy', label: 'Cymraeg' },
  { code: 'pl', label: 'Polski' }
];

export type TranslationKey =
  | 'topbar.mode'
  | 'hero.eyebrow'
  | 'hero.title'
  | 'hero.subtitle'
  | 'hero.statLabel'
  | 'progress.step1'
  | 'progress.step2'
  | 'triage.eyebrow'
  | 'triage.title'
  | 'triage.helper'
  | 'triage.placeholder'
  | 'triage.characters'
  | 'triage.checking'
  | 'triage.findCare'
  | 'triage.legal'
  | 'triage.addDetails'
  | 'trust.guardrails'
  | 'trust.dataUk'
  | 'trust.nhs'
  | 'location.step'
  | 'location.title'
  | 'location.postcodePlaceholder'
  | 'location.search'
  | 'location.loading'
  | 'location.selected'
  | 'location.selectPrompt'
  | 'location.kmAway'
  | 'location.openToday'
  | 'tabs.appointments'
  | 'tabs.pharmacy'
  | 'registration.label'
  | 'registration.notRegistered'
  | 'registration.loading'
  | 'registration.noGp'
  | 'registration.registeredHint'
  | 'registration.walkInHint'
  | 'result.complete'
  | 'slots.eyebrow'
  | 'slots.title'
  | 'slots.open'
  | 'slots.empty'
  | 'slots.hold'
  | 'slots.registerFirst'
  | 'slots.available'
  | 'slots.outOfArea'
  | 'slots.mustRegister'
  | 'slots.gpSurgery'
  | 'slots.walkIn'
  | 'slots.urgentCare'
  | 'slots.booked'
  | 'pharmacy.eyebrow'
  | 'pharmacy.title'
  | 'pharmacy.placeholder'
  | 'pharmacy.search'
  | 'pharmacy.searching'
  | 'pharmacy.prompt'
  | 'pharmacy.noResults'
  | 'pharmacy.inStock'
  | 'pharmacy.lowStock'
  | 'pharmacy.outOfStock'
  | 'pharmacy.units'
  | 'pharmacy.updated'
  | 'emergency.eyebrow'
  | 'emergency.title'
  | 'emergency.body'
  | 'emergency.signal'
  | 'emergency.call'
  | 'emergency.understand'
  | 'language.label';

export const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    'topbar.mode': 'Prototype mode',
    'hero.eyebrow': 'Cambridgeshire care navigator',
    'hero.title': 'Care, sooner.',
    'hero.subtitle': 'Describe how you feel. GPNow checks urgency first, then finds the right appointment nearby.',
    'hero.statLabel': 'average to first option',
    'progress.step1': 'Your symptoms',
    'progress.step2': 'Your options',
    'triage.eyebrow': 'Private and secure',
    'triage.title': 'How are you feeling?',
    'triage.helper': 'Share as much as you can. Our clinical safety layer will check for anything urgent.',
    'triage.placeholder': 'Tell us what is happening, including when it started...',
    'triage.characters': '{n}/1,000 characters',
    'triage.checking': 'Checking safely...',
    'triage.findCare': 'Find the right care',
    'triage.legal': 'Not a diagnosis. If you feel seriously unwell, call 999.',
    'triage.addDetails': 'Add a few details before starting triage.',
    'trust.guardrails': 'Protected by clinical guardrails',
    'trust.dataUk': 'Data stays in the UK',
    'trust.nhs': 'Built for NHS pathways',
    'location.step': 'Step 2',
    'location.title': 'Nearby practices',
    'location.postcodePlaceholder': 'Enter postcode',
    'location.search': 'Search',
    'location.loading': 'Loading local care network...',
    'location.selected': 'Selected practice',
    'location.selectPrompt': 'Select a practice on the map',
    'location.kmAway': '{n} km away',
    'location.openToday': 'Open today',
    'tabs.appointments': 'Appointments',
    'tabs.pharmacy': 'Pharmacy Stock',
    'registration.label': 'Your registered GP:',
    'registration.notRegistered': 'I am not registered / not sure',
    'registration.loading': 'Loading nearby practices...',
    'registration.noGp': 'No GP practices found in this area.',
    'registration.registeredHint':
      'Appointments at your registered GP are bookable. Walk-in and urgent care options are always shown.',
    'registration.walkInHint': 'Walk-in centres and urgent care do not require registration.',
    'result.complete': 'Safety check complete.',
    'slots.eyebrow': 'Live availability',
    'slots.title': 'The next best appointments',
    'slots.open': '{n} open',
    'slots.empty': 'Run a triage to surface suitable appointments.',
    'slots.hold': 'Hold slot',
    'slots.registerFirst': 'Register first',
    'slots.available': 'Available',
    'slots.outOfArea': 'Accepts out-of-area patients. Home visits may be limited.',
    'slots.mustRegister': 'You must be registered at this practice to book.',
    'slots.gpSurgery': 'GP surgery',
    'slots.walkIn': 'Walk-in centre',
    'slots.urgentCare': 'Urgent care',
    'slots.booked': '{role} appointment held for 10 minutes. Booking handoff is next.',
    'pharmacy.eyebrow': 'Medication availability',
    'pharmacy.title': 'Check nearby pharmacy stock',
    'pharmacy.placeholder': 'e.g. paracetamol, ibuprofen...',
    'pharmacy.search': 'Search',
    'pharmacy.searching': 'Searching...',
    'pharmacy.prompt': 'Enter a medicine name to see stock at nearby pharmacies.',
    'pharmacy.noResults': 'No pharmacies found with that medicine in stock nearby.',
    'pharmacy.inStock': 'In stock',
    'pharmacy.lowStock': 'Low stock',
    'pharmacy.outOfStock': 'Out of stock',
    'pharmacy.units': '{n} units',
    'pharmacy.updated': 'Updated {date}',
    'emergency.eyebrow': 'Immediate action',
    'emergency.title': 'Please call 999 now',
    'emergency.body':
      'Your answers may indicate a medical emergency. Do not wait for a GP appointment. If you can, unlock your front door and keep your phone nearby.',
    'emergency.signal': 'Signal: {guideline}',
    'emergency.call': 'Call 999',
    'emergency.understand': 'I understand, return to GPNow',
    'language.label': 'Language'
  },
  cy: {
    'topbar.mode': 'Modd prototeip',
    'hero.eyebrow': 'Llywiwr gofal Sir Gaergrawnt',
    'hero.title': 'Gofal, yn gynt.',
    'hero.subtitle':
      'Disgrifiwch sut rydych chi\'n teimlo. Mae GPNow yn gwirio brys yn gyntaf, yna\'n dod o hyd i\'r apwyntiad cywir gerllaw.',
    'hero.statLabel': 'ar gyfartaledd i\'r opsiwn cyntaf',
    'progress.step1': 'Eich symptomau',
    'progress.step2': 'Eich opsiynau',
    'triage.eyebrow': 'Preifat a diogel',
    'triage.title': 'Sut rydych chi\'n teimlo?',
    'triage.helper': 'Rhannwch gymaint ag y gallwch. Bydd ein haen diogelwch clinigol yn gwirio am unrhyw beth brys.',
    'triage.placeholder': 'Dywedwch wrthym beth sy\'n digwydd, gan gynnwys pryd y dechreuodd...',
    'triage.characters': '{n}/1,000 nod',
    'triage.checking': 'Yn gwirio\'n ddiogel...',
    'triage.findCare': 'Dod o hyd i\'r gofal cywir',
    'triage.legal': 'Nid diagnosis mo hwn. Os ydych chi\'n teimlo\'n ddifrifol wael, ffoniwch 999.',
    'triage.addDetails': 'Ychwanegwch ychydig o fanylion cyn dechrau brysbennu.',
    'trust.guardrails': 'Wedi\'i ddiogelu gan ganllawiau clinigol',
    'trust.dataUk': 'Mae data\'n aros yn y DU',
    'trust.nhs': 'Wedi\'i adeiladu ar gyfer llwybrau\'r GIG',
    'location.step': 'Cam 2',
    'location.title': 'Meddygfeydd cyfagos',
    'location.postcodePlaceholder': 'Rhowch god post',
    'location.search': 'Chwilio',
    'location.loading': 'Yn llwytho\'r rhwydwaith gofal lleol...',
    'location.selected': 'Meddygfa a ddewiswyd',
    'location.selectPrompt': 'Dewiswch feddygfa ar y map',
    'location.kmAway': '{n} km i ffwrdd',
    'location.openToday': 'Ar agor heddiw',
    'tabs.appointments': 'Apwyntiadau',
    'tabs.pharmacy': 'Stoc Fferyllfa',
    'registration.label': 'Eich meddyg teulu cofrestredig:',
    'registration.notRegistered': 'Nid wyf wedi cofrestru / ddim yn siŵr',
    'registration.loading': 'Yn llwytho meddygfeydd cyfagos...',
    'registration.noGp': 'Ni chanfuwyd unrhyw feddygfeydd yn yr ardal hon.',
    'registration.registeredHint':
      'Gellir archebu apwyntiadau yn eich meddyg teulu cofrestredig. Dangosir opsiynau galw i mewn a gofal brys bob amser.',
    'registration.walkInHint': 'Nid oes angen cofrestru ar gyfer canolfannau galw i mewn a gofal brys.',
    'result.complete': 'Gwiriad diogelwch wedi\'i gwblhau.',
    'slots.eyebrow': 'Argaeledd byw',
    'slots.title': 'Yr apwyntiadau gorau nesaf',
    'slots.open': '{n} ar agor',
    'slots.empty': 'Rhedwch frysbennu i ddangos apwyntiadau addas.',
    'slots.hold': 'Dal slot',
    'slots.registerFirst': 'Cofrestrwch yn gyntaf',
    'slots.available': 'Ar gael',
    'slots.outOfArea': 'Yn derbyn cleifion o\'r tu allan i\'r ardal. Gall ymweliadau cartref fod yn gyfyngedig.',
    'slots.mustRegister': 'Rhaid i chi fod wedi cofrestru yn y feddygfa hon i archebu.',
    'slots.gpSurgery': 'Meddygfa',
    'slots.walkIn': 'Canolfan galw i mewn',
    'slots.urgentCare': 'Gofal brys',
    'slots.booked': 'Apwyntiad {role} wedi\'i ddal am 10 munud. Trosglwyddo archeb yw\'r cam nesaf.',
    'pharmacy.eyebrow': 'Argaeledd meddyginiaeth',
    'pharmacy.title': 'Gwiriwch stoc fferyllfa gyfagos',
    'pharmacy.placeholder': 'e.e. paracetamol, ibuprofen...',
    'pharmacy.search': 'Chwilio',
    'pharmacy.searching': 'Yn chwilio...',
    'pharmacy.prompt': 'Rhowch enw meddyginiaeth i weld stoc mewn fferyllfeydd cyfagos.',
    'pharmacy.noResults': 'Ni chanfuwyd unrhyw fferyllfeydd â\'r feddyginiaeth honno mewn stoc gerllaw.',
    'pharmacy.inStock': 'Mewn stoc',
    'pharmacy.lowStock': 'Stoc isel',
    'pharmacy.outOfStock': 'Allan o stoc',
    'pharmacy.units': '{n} uned',
    'pharmacy.updated': 'Diweddarwyd {date}',
    'emergency.eyebrow': 'Gweithredu ar unwaith',
    'emergency.title': 'Ffoniwch 999 nawr',
    'emergency.body':
      'Efallai bod eich atebion yn dangos argyfwng meddygol. Peidiwch ag aros am apwyntiad meddyg teulu. Os gallwch, datglowch eich drws ffrynt a chadwch eich ffôn gerllaw.',
    'emergency.signal': 'Arwydd: {guideline}',
    'emergency.call': 'Ffoniwch 999',
    'emergency.understand': 'Rwy\'n deall, dychwelyd i GPNow',
    'language.label': 'Iaith'
  },
  pl: {
    'topbar.mode': 'Tryb prototypu',
    'hero.eyebrow': 'Nawigator opieki Cambridgeshire',
    'hero.title': 'Opieka, szybciej.',
    'hero.subtitle':
      'Opisz, jak się czujesz. GPNow najpierw sprawdza pilność, a następnie znajduje odpowiednią wizytę w pobliżu.',
    'hero.statLabel': 'średnio do pierwszej opcji',
    'progress.step1': 'Twoje objawy',
    'progress.step2': 'Twoje opcje',
    'triage.eyebrow': 'Prywatne i bezpieczne',
    'triage.title': 'Jak się czujesz?',
    'triage.helper': 'Podziel się jak największą ilością informacji. Nasza warstwa bezpieczeństwa sprawdzi, czy coś jest pilne.',
    'triage.placeholder': 'Powiedz nam, co się dzieje, w tym kiedy się zaczęło...',
    'triage.characters': '{n}/1000 znaków',
    'triage.checking': 'Bezpieczne sprawdzanie...',
    'triage.findCare': 'Znajdź właściwą opiekę',
    'triage.legal': 'To nie jest diagnoza. Jeśli czujesz się poważnie chory, zadzwoń pod 999.',
    'triage.addDetails': 'Dodaj kilka szczegółów przed rozpoczęciem selekcji.',
    'trust.guardrails': 'Chronione przez zabezpieczenia kliniczne',
    'trust.dataUk': 'Dane pozostają w Wielkiej Brytanii',
    'trust.nhs': 'Zbudowane dla ścieżek NHS',
    'location.step': 'Krok 2',
    'location.title': 'Przychodnie w pobliżu',
    'location.postcodePlaceholder': 'Wpisz kod pocztowy',
    'location.search': 'Szukaj',
    'location.loading': 'Ładowanie lokalnej sieci opieki...',
    'location.selected': 'Wybrana przychodnia',
    'location.selectPrompt': 'Wybierz przychodnię na mapie',
    'location.kmAway': '{n} km stąd',
    'location.openToday': 'Otwarte dzisiaj',
    'tabs.appointments': 'Wizyty',
    'tabs.pharmacy': 'Stan apteki',
    'registration.label': 'Twój zarejestrowany lekarz:',
    'registration.notRegistered': 'Nie jestem zarejestrowany / nie jestem pewien',
    'registration.loading': 'Ładowanie pobliskich przychodni...',
    'registration.noGp': 'Nie znaleziono przychodni w tej okolicy.',
    'registration.registeredHint':
      'Wizyty u zarejestrowanego lekarza można rezerwować. Opcje przychodni bez rejestracji i pilnej opieki są zawsze wyświetlane.',
    'registration.walkInHint': 'Przychodnie bez rejestracji i pilna opieka nie wymagają rejestracji.',
    'result.complete': 'Kontrola bezpieczeństwa zakończona.',
    'slots.eyebrow': 'Dostępność na żywo',
    'slots.title': 'Najlepsze dostępne wizyty',
    'slots.open': '{n} dostępnych',
    'slots.empty': 'Uruchom selekcję, aby wyświetlić odpowiednie wizyty.',
    'slots.hold': 'Zarezerwuj',
    'slots.registerFirst': 'Najpierw zarejestruj się',
    'slots.available': 'Dostępne',
    'slots.outOfArea': 'Przyjmuje pacjentów spoza obszaru. Wizyty domowe mogą być ograniczone.',
    'slots.mustRegister': 'Musisz być zarejestrowany w tej przychodni, aby rezerwować.',
    'slots.gpSurgery': 'Przychodnia lekarska',
    'slots.walkIn': 'Przychodnia bez rejestracji',
    'slots.urgentCare': 'Pilna opieka',
    'slots.booked': 'Wizyta {role} zarezerwowana na 10 minut. Następnie przekazanie rezerwacji.',
    'pharmacy.eyebrow': 'Dostępność leków',
    'pharmacy.title': 'Sprawdź stan pobliskiej apteki',
    'pharmacy.placeholder': 'np. paracetamol, ibuprofen...',
    'pharmacy.search': 'Szukaj',
    'pharmacy.searching': 'Wyszukiwanie...',
    'pharmacy.prompt': 'Wpisz nazwę leku, aby zobaczyć stan w pobliskich aptekach.',
    'pharmacy.noResults': 'Nie znaleziono pobliskich aptek z tym lekiem w magazynie.',
    'pharmacy.inStock': 'Dostępny',
    'pharmacy.lowStock': 'Niski stan',
    'pharmacy.outOfStock': 'Brak w magazynie',
    'pharmacy.units': '{n} sztuk',
    'pharmacy.updated': 'Zaktualizowano {date}',
    'emergency.eyebrow': 'Natychmiastowe działanie',
    'emergency.title': 'Zadzwoń teraz pod 999',
    'emergency.body':
      'Twoje odpowiedzi mogą wskazywać na nagły przypadek medyczny. Nie czekaj na wizytę u lekarza. Jeśli możesz, otwórz drzwi wejściowe i trzymaj telefon w pobliżu.',
    'emergency.signal': 'Sygnał: {guideline}',
    'emergency.call': 'Zadzwoń pod 999',
    'emergency.understand': 'Rozumiem, wróć do GPNow',
    'language.label': 'Język'
  }
};
