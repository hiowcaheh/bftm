# Changelog

## 0.28.4 — koniec migającej ikonki kasku przy starcie (2026-07-16)

- Ekran logowania: zamiast migającej ikonki kasku podczas ładowania jest teraz
  delikatny placeholder, a logo firmy pojawia się płynnie (fade-in) gdy się wczyta.


## 0.28.3 — ikona aplikacji: błyszcząca wersja 3D (2026-07-16)

- Ikona aplikacji zmieniona na dostarczoną wersję **3D/glossy** (czerwona
  kafelka z wytłoczonymi literami BF/TM). Przycięta do kafelki i wygenerowana
  w komplecie: favicon, apple-touch-icon, PWA 192/512 + maskable.


## 0.28.2 — nowa ikona aplikacji (BFTM) (2026-07-16)

- Nowa ikona aplikacji: czerwona ceglana ikonka z literami **B/F/T/M** (siatka
  2×2, F nad M, symetrycznie, pogrubione litery) — odrysowana jako wektor.
- Podmieniony komplet: favicon (SVG + PNG), apple-touch-icon, ikony PWA
  192/512 + maskable. Po dodaniu do ekranu głównego pojawi się nowa ikona.


## 0.28.1 — tekstura tła tylko w pustych miejscach (2026-07-16)

- Firmowa tekstura logo jest teraz **za** treścią (nie na wierzchu) — widoczna
  tylko w pustych miejscach strony; karty (Ten tydzień, tabela godzin itd.)
  pozostają czyste i czytelne.


## 0.28.0 — szybkie dodawanie w dzienniku + tekstura logo (2026-07-16)

- **Dziennik godzin** (admin / `hours_edit_all`): klik w **pustą komórkę**
  (pracownik × dzień) otwiera formularz dodawania z już wybranym pracownikiem
  i dniem — szybsze uzupełnianie pustych dni. Komórki z wpisem działają jak
  dotąd (szczegóły + edycja).
- **Tło**: znak wodny wrócił do drobnej tekstury — mnóstwo malutkich logo pod
  kątem, jeszcze mniej widoczne (opacity 3%).

## 0.27.2 — logo w tle faktycznie widoczne (2026-07-16)

- Znak wodny z logo chował się za nieprzezroczystymi kartami (widoczny tylko
  w pustych miejscach). Teraz to subtelna nakładka przy górze (nad treścią,
  pod paskiem i menu, klik przechodzi) — widoczna na każdej stronie od góry.

## 0.27.1 — poprawki check-listy + logo w tle (2026-07-16)

- Usunięty czerwony przycisk **+** (dodawanie godzin) z pulpitu — kolidował z
  przyciskiem check-listy. Godziny dodajesz z zakładki Godziny / karty „dodaj
  dzisiejsze godziny".
- **Powiadomienie (dzwoneczek)** dla wszystkich aktywnych pracowników przy
  dodaniu nowego zadania na **firmowej** check-liście (bez powiadomień przy
  zmianie statusu/usunięciu; migracja 0033).
- **Toasty** (górne) przy dodaniu / odhaczeniu / usunięciu zadania.
- **Logo firmowe w tle** — pojedyncze, przy górze, widoczne na każdej stronie
  (wcześniej ledwo widoczna tekstura tylko na dole pulpitu).

## 0.27.0 — Check-lista na pulpicie (firmowa + prywatna, realtime) (2026-07-16)

- Nowa sekcja **Check-lista** na dole pulpitu (pod „Ten tydzień").
- **Firmowa** (wspólna, główna): każdy aktywny pracownik może dodawać zadania
  (projekt + priorytet + treść), odhaczać i usuwać. Zaznaczone są przekreślone;
  widać kto dodał i kto zamknął.
- **Prywatna**: własna lista pracownika — widoczna tylko dla niego. Zakładka
  Firmowa/Prywatna pojawia się u posiadaczy nowej flagi **`checklist_private`**
  (oraz admina); pozostali widzą samą firmową.
- **Realtime**: dodanie / zmiana statusu / edycja / usunięcie odświeża się na
  żywo u wszystkich (Supabase Realtime; migracja 0032).
- Zabezpieczone RLS: firmową widzą/edytują wszyscy aktywni; prywatną tylko
  właściciel (i tworzyć może tylko z flagą).

## 0.26.2 — przyciski kopiowania i szybkie akcje kontaktu (2026-07-16)

- Karta pracownika: przy e-mailu i telefonie przyciski **napisz / zadzwoń**
  (mailto/tel) oraz **kopiuj** do schowka.
- Szczegóły projektu: przy adresie budowy przycisk **kopiuj adres**.

## 0.26.1 — drobne poprawki UI (2026-07-16)

- Przycisk **„Pobierz"** danych firmy przeniesiony do jednej linii, po prawej
  stronie pola organisationsnummer (akcentowy).
- **Aktywność konta** pracownika: 10 wpisów na stronę + zakładki ze stronami.
- Powiększony napis **BFTM** na górnym pasku.
- Nieco mniejszy dzwoneczek powiadomień (prawy górny róg).
- Pulpit pracownika: ikona na czerwonej karcie „dodaj godziny" zmieniona ze
  słońca na **zegar** (jak w zakładce Godziny).

## 0.26.0 — auto-pobieranie danych firmy po organisationsnummer (2026-07-16)

- W formularzu klienta (typ **Firma**) przycisk **„Pobierz dane firmy"** obok
  organisationsnummer: wpisujesz nr organizacyjny → nazwa i adres wpisują się
  same (dopisujesz tylko e-mail). Źródło: darmowe VIES (VAT) przez VATComply.
- Backend: RPC `lookup_company_by_orgnr` (security definer, rozszerzenie `http`),
  składa szwedzki nr VAT (orgnr + „01"), zabezpieczone prawem edycji klientów
  (migracja 0031). Klient prywatny (personnummer) — bez zmian, ręcznie.

## 0.25.4 — lightbox podglądu, większe logo, stopka +org/www, tygodnie w kalendarzu (2026-07-16)

- **Podgląd PDF jako lightbox**: zamazane (blur) i przyciemnione tło ponad całą
  aplikacją, strony PDF jako karty „jak zdjęcie", pływający przycisk **✕** w rogu,
  zamknięcie też tapnięciem w tło lub Escape. Menu na dole jest wygaszone.
- **Większe logo** w nagłówku PDF (fit 200×96 zamiast 150×70).
- **Stopka PDF**: dodany **Org.nr** i **strona www** (z domeny e-maila) obok
  telefonu i e-maila — w dwóch wyśrodkowanych liniach.
- **Kalendarz w modalu** specyfikacji: kolumna z **numerem tygodnia (ISO)** po
  lewej przy każdym wierszu (opcja `showWeekNumbers` w RangeCalendar).

## 0.25.3 — poprawki podglądu PDF: logo, stopka, modal (2026-07-16)

- **Logo w PDF** ładowane przez `storage.download()` (ten sam kanał co reszta
  Supabase) — wcześniej `fetch` po publicznym URL bywał blokowany i logo się
  nie pokazywało.
- **Stopka PDF** zawiera teraz telefon i e-mail firmy obok nazwy
  (np. „BFTM Fasad & Bygg AB · Tel. … · kontakt@…").
- **Podgląd PDF** jako pełny modal: wyższy z-index (nad dolnym menu), blokada
  przewijania tła, wyraźny przycisk **„✕ Zamknij"** w lewym górnym rogu,
  zamykanie klawiszem Escape.

## 0.25.2 — numery tygodni w PDF specyfikacji (2026-07-16)

- W tabeli PDF wiersze są pogrupowane po **tygodniu ISO** (od poniedziałku),
  a przed każdą grupą jest pasek z numerem tygodnia po lewej („v. 28", „v. 29"…).

## 0.25.1 — podgląd PDF w aplikacji przed wysłaniem (2026-07-16)

- Kliknięcie specyfikacji **otwiera podgląd PDF w aplikacji** (strony renderowane
  przez `pdf.js`, działa też w PWA na iPhonie) — a dopiero na dole jest przycisk
  **„Zapisz / wyślij PDF"**. Wcześniej od razu wyskakiwało okno udostępniania.
- `pdf.js` ładowany leniwie (osobny chunk); worker przez `?worker` (bezpieczny
  typ MIME na GitHub Pages).

## 0.25.0 — Specyfikacje faktury (Faktura underlag) → PDF (2026-07-16)

- Nowa zakładka **Specyfikacje faktury** (menu „Więcej", obok Specyfikacji
  wypłaty). Lista zapisanych specyfikacji; przycisk **+** otwiera modal:
  klient → projekt → **okres wybierany kalendarzem zakresu** (jak przy
  nieobecnościach) → tytuł → **Generuj PDF**.
- **PDF w układzie underlag** (jak wzorzec faktury): logo firmy w lewym górnym
  rogu, po prawej firma + „Underlag för {tytuł} – {projekt}" + okres +
  „Totalt arbetade timmar". Tabela: **ÄTA Namn · Projekt · Datum · Anställd ·
  Arb. h · Anteckning**. Tekst **zawija się**, a wysokość wiersza rośnie — nic
  nie wychodzi za ramkę; tabela poprawnie łamie się między stronami.
- Dane liczone **na żywo** z godzin (RPC `invoice_spec_items`). PDF generowany
  po stronie klienta (`pdfmake`, ładowany leniwie — nie obciąża głównego
  bundla). Zapis/wysyłka przez natywne udostępnianie (iOS: „Zapisz w Plikach").
- Nowa flaga uprawnień **`invoices_manage`** („Specyfikacje faktury") —
  zakładka i dostęp tylko dla admina lub pracownika z tą flagą; zabezpieczone
  RLS + guardem w RPC (migracja 0030).

## 0.24.3 — nieobecności w sekcji Pracownicy (raport z linku) (2026-07-14)

- W udostępnianym raporcie nieobecności są teraz **pod danym pracownikiem,
  pod jego projektami** — wyszczególnione dzień po dniu (data + typ). Zniknęła
  osobna sekcja u góry. Pracownicy z samą nieobecnością (0 h) też się pokazują.

## 0.24.2 — nieobecności: dzień po dniu (link) + w rozwijanym pracowniku (2026-07-14)

- **Raport z linku**: sekcja Nieobecności przeniesiona na górę (przy godzinach)
  i rozbita na **pojedyncze dni** (kto, którego dnia, jaki typ) zamiast okresów.
- **Strona Raporty (w apce)**: przy pracowniku zamiast rzędu badge jest teraz
  zwięzły znacznik „X dni nieobecności", a **szczegóły (każdy typ w osobnej
  linii) pokazują się po rozwinięciu** strzałką, razem z godzinami.

## 0.24.1 — nieobecności także w raporcie z linku (2026-07-14)

- Udostępniany raport (link/snapshot) zawiera teraz sekcję **Nieobecności**:
  kto, w jakim terminie i z jakiego powodu (Semester/VAB/Sjuk…) + ewentualna
  notatka. Snapshot zapisuje je w chwili utworzenia linku (migracja 0029).

## 0.24.0 — klient widoczny dla pracownika + nieobecności w raporcie (2026-07-14)

- **Klient projektu widoczny też dla pracownika** (bez `clients_view`):
  `project_stats` zwraca nazwę i typ klienta (tylko to, nie dane wrażliwe),
  więc na karcie widać klienta, a ikona w tle zmienia się dom/budynek wg typu.
- **Nieobecności w raporcie**: przy każdym pracowniku dni Semester / VAB / Sjuk
  itp. w wybranym miesiącu (nowy agregat `report_absences`, dostęp reports_view).
  Pracownicy z samą nieobecnością (0 h) też się pokazują (migracja 0028).

## 0.23.0 — avatary „dziś na budowie" + zdjęcia przy godzinach (2026-07-13)

- **Karta projektu**: avatary pokazują tylko osoby, które pracowały **dziś**
  na tym projekcie, z podpisem „Dziś" (zamiast wszystkich z historii).
- **Szczegóły projektu → Godziny**: przy każdym pracowniku na liście „kto ile
  przepracował" doszło zdjęcie profilowe (fallback inicjały).

## 0.22.1 — naprawa crashu na Projektach (2026-07-12)

- **Krytyczna poprawka**: lista projektów wywalała aplikację. Agregat
  `project_stats` zwracał `Map`, a cache jest utrwalany w localStorage przez
  JSON — `Map` serializował się do „{}" i po odtworzeniu `.get()` rzucał błąd.
  Zamienione na zwykły obiekt (serializowalny).

## 0.22.0 — avatary, sortowanie, ikona wg klienta, mapa budowy (2026-07-12)

- **Prawdziwe zdjęcia pracowników** na kartach projektów (fallback inicjały);
  `project_stats` zwraca teraz avatary (migracja 0026).
- **Domyślne sortowanie** listy projektów: najpierw aktywne, potem oferty,
  wstrzymane, zakończone, anulowane.
- **Ikona w tle karty zależna od typu klienta**: klient prywatny (ROT) → dom,
  firma → budynek.
- **Karta szczegółów projektu**: podgląd lokalizacji budowy na mapie
  (OpenStreetMap) + przycisk **„Nawiguj do budowy"** otwierający Mapy Apple.

## 0.21.0 — karty projektów z danymi + logo na belce (2026-07-12)

- **Karta projektu**: tekst do lewej, kolorowanie karty wg koloru projektu
  (listwa), duża ikona w kolorze projektu jako półprzezroczyste tło po prawej
  (jak na Pulpicie).
- **Postęp godzin** (przepracowane / limit szacowany) z paskiem oraz
  **awatary pracowników** — dane z nowego agregatu `project_stats` (migracja
  0025, tylko odczyt, bez finansów).
- **Górna belka**: subtelny czerwony napis **BFTM** na środku, na każdej stronie.

## 0.20.1 — karty projektów z monogramem (2026-07-12)

- Zamiast nasyconego kwadratu z ikoną — **monogram** (inicjały projektu w
  jego kolorze na delikatnym tle), styl kontaktów iOS. Nowocześniej i czyściej.

## 0.20.0 — odświeżona zakładka Projekty (2026-07-12)

- **Nowe karty projektów** w stylu Apple: kafelek w kolorze projektu z ikoną,
  status jako kolorowy badge, klient, adres, szacowane godziny i wartość.
- **Pasek podsumowania** na górze: Aktywne / Wartość w toku (lub Oferty) /
  Oferty (lub Zakończone) — mini-kafelki z ikoną w tle, jak na Pulpicie.
- Zmiany wyłącznie wizualne (frontend) — filtry, wyszukiwarka i dane bez zmian.

## 0.19.1 — subtelny znak wodny z logo w tle (2026-07-12)

- Delikatna firmowa tekstura: logo powtórzone pod skosem, ledwo widoczne,
  jako tło całej zalogowanej części aplikacji.

## 0.19.0 — odświeżony Pulpit w stylu Apple (2026-07-12)

- **Kafelki KPI**: duża, półprzezroczysta ikona „w tle" po prawej stronie
  i większa wartość — nowocześniejszy, czystszy wygląd (admin i pracownik).
- Nagłówek sekcji dnia: **„Dzisiaj, {dzień tygodnia} DD/MM"** zamiast
  „Twój dzień".
- Przy „Ten tydzień" badge z numerem tygodnia (**V{nr}**, np. V29).

## 0.18.3 — obecność zapisywana przy logowaniu (trigger) (2026-07-12)

- **Każde logowanie odświeża „ostatnio online"** przez trigger w bazie —
  działa niezależnie od wersji aplikacji (nawet na starym, zcache'owanym
  kodzie). Uzupełniono też daty z historii logowań, więc statusy pojawiły
  się od razu dla wszystkich.
- Karta pracownika bez żadnej aktywności pokazuje „Brak aktywności" zamiast
  pustki.

## 0.18.2 — obecność łapana przy aktywności (2026-07-12)

- „Ostatnio online" zapisuje się przy logowaniu oraz przy realnym ruchu na
  stronie (dotyk/klik/klawisz/powrót do apki), throttling co 60 s. Gdy ktoś
  jest bezczynny, data zostaje na ostatniej aktywności — status jest zgodny
  z prawdą dla każdego pracownika.

## 0.18.1 — status online tylko na karcie pracownika (2026-07-12)

- Badge obecności („Online" / „ostatnio X temu") pokazuje się **tylko po
  wejściu w szczegóły pracownika**, a nie na liście zespołu.

## 0.18.0 — obecność przy każdym członku zespołu (2026-07-12)

- **Status online przy każdym członku** na liście Zespołu (nie tylko na
  karcie): zielony „Online" gdy aktywny w ostatnich 3 min, inaczej „ostatnio
  X temu". Widoczne dla admina i osób z podglądem zespołu.
- Wspólny komponent `OnlineBadge` (lista = karta), wersja kompaktowa na liście.
- Uwaga: żeby czas był aktualny, wszyscy muszą być na 0.17.0+ — dopiero ta
  wersja pinguje obecność (`touch_last_seen`).

## 0.17.0 — podgląd maila + firmowa szata oferty, badge Admin, obecność (2026-07-12)

- **Podgląd maila przed wysłaniem**: klik „Wyślij e-mailem" otwiera podgląd
  1:1 tego, co dostanie klient, z przyciskiem „Wyślij ofertę mailem".
- **Nowa szata maila** zgodna z firmowym wzorem: granatowy nagłówek z logo,
  czerwony pasek „Offert för: …", przycisk „Visa fullständig offert", link
  zapasowy, data ważności, sekcja „Kontakta oss" (Tomasz/Mateusz, e-post,
  webbplats) i granatowa stopka. HTML budowany po stronie aplikacji, więc
  podgląd = wysyłka.
- **Badge „Admin"** zamiast „Właściciel" wszędzie (karta pracownika, menu
  Więcej, mój profil).
- **Obecność online**: naprawiony ping „ostatnio online" (RPC `touch_last_seen`)
  — badge na karcie pracownika wreszcie się zapełnia; widoczny dla admina
  i osób z podglądem zespołu.

## 0.16.1 — poprawka zawieszania „Sprawdź aktualizację" (2026-07-11)

- **„Sprawdź aktualizację" nie kręci się już w nieskończoność**: gdy nowa
  wersja utknęła na etapie instalacji, pętla sprawdzająca ignorowała limit
  czasu. Teraz limit zawsze wygrywa (10 s), a gdy instalacja dokończy się
  później, i tak pojawi się toast „nowa wersja".

## 0.16.0 — wysyłka ofert e-mailem przez Resend (2026-07-11)

- **Wyślij ofertę e-mailem**: przycisk w „Wyślij ofertę" wysyła klientowi
  ładnego HTML-a (branding BFTM, przycisk „Öppna offerten" do publicznej
  strony oferty) — zamiast otwierać aplikację pocztową. Nadawca
  `kontakt@bftm.se`, odpowiedzi trafiają na `mateus@bftm.se`.
- Wysyłkę obsługuje RPC `send_offer_email` (Resend przez rozszerzenie
  `http` w Postgresie). Klucz API leży w serwerowej tabeli `app_secrets`
  (RLS + odebrane granty — czyta go wyłącznie funkcja security-definer),
  więc nie trafia do aplikacji ani do repozytorium (migracje 0021, 0022).

## 0.15.0 — Zespół zamiast Pracowników, obecność online, „zapamiętaj mnie" (2026-07-11)

- **Pulpit pracownika**: sekcja „Ten tydzień" (poniedziałek–niedziela) tak
  samo jak u admina — zamiast „Ostatnie 7 dni". RLS pokazuje pracownikowi
  tylko jego godziny.
- **„Zespół"** zamiast „Pracownicy” — nowa nazwa zakładki w nawigacji i na
  ekranach.
- **Obecność online**: na karcie pracownika badge „Online" (widziany w
  ostatnich 3 min) albo „Ostatnio … temu"; klient pinguje `last_seen_at`
  co minutę i po powrocie do aplikacji (migracja 0020).
- Karta pracownika: usunięty słaby badge „Pracownik"; właściciel oznaczony
  jako „Właściciel".
- **Zarządzanie pracownikiem**: uprawnienie „Specyfikacje wypłaty"
  przeniesione do grupy „Raporty i finanse" z badge **wrażliwe**.
- **Szybsze łapanie aktualizacji**: aplikacja sama odpytuje serwer o nową
  wersję co minutę oraz po każdym powrocie do apki; toast „nowa wersja" ma
  nowocześniejszy przycisk „Odśwież" (wypełniony, z ikoną).
- **Logowanie**: checkbox „Zapamiętaj mnie" — wyłączony wylogowuje po
  zamknięciu aplikacji (sesja w `sessionStorage` zamiast `localStorage`).
- Konto właściciela: wyświetlany e-mail zmieniony na **mateus@bftm.se**
  (login „admin" nadal działa).

## 0.14.0 — zdjęcia profilowe, filtry specyfikacji, licznik wyświetleń ofert (2026-07-11)

- **Zdjęcie profilowe**: w „Mój profil" wgrywasz avatar (aparat/galeria);
  pokazuje się wszędzie — menu Więcej, lista i karta pracownika. Można też
  edytować własne imię i nazwisko. Publiczny bucket `avatars`, RLS: własny
  avatar / admin (migracja 0021).
- Konto właściciela: „Administrator" zmienione na **Mateusz Owczarek**.
- **Specyfikacje wypłaty**: dla zarządzającego filtry miesiąca i roku
  (obok filtra pracownika).
- **Oferty**: ikona oka z licznikiem wyświetleń — na karcie oferty (pod
  statusem) i w pasku „Otwarta przez klienta".

## 0.13.0 — specyfikacje: podgląd, udostępnianie, uprawnienie, przypomnienie (2026-07-11)

- **Podgląd przed wysłaniem**: wgrywając specyfikację widać miniaturę
  (zdjęcie) lub nazwę pliku (PDF), żeby nie wysłać do złej osoby.
- **Zapisz / udostępnij**: przy podglądzie specyfikacji przycisk otwiera
  systemowe menu iOS (Zapisz w Plikach / Zdjęcia / wyślij dalej).
- **Uprawnienie „Specyfikacje wypłaty"** (`payslips_manage`): możesz
  wyznaczyć pracownika do wgrywania lönespec — widzi też swoje własne
  (migracja 0020).
- **Powiadomienie** po polsku („specyfikacja wypłaty"); tapnięcie
  przenosi do widoku specyfikacji.
- **Pulpit**: kafel specyfikacji zniknął u zarządzających — zamiast niego
  od **20. dnia miesiąca** pojawia się przypomnienie „Zostało 5 dni do
  wypłat — uzupełnij specyfikacje za {poprzedni miesiąc}" (znika, gdy
  wszyscy pracownicy mają już wgrane); pracownik ma skrót do własnych.
- **„Ten tydzień"** zamiast „Ostatnie wpisy" na pulpicie widoku ogólnego —
  pon–ndz bieżącego tygodnia z sumą godzin, dzisiejszy dzień wyróżniony.

## 0.12.0 — Specyfikacje wypłaty (lönespec) + dzwoniący budzik (2026-07-11)

- **Specyfikacje wypłaty**: nowy moduł (Więcej + belka na Pulpicie).
  Właściciel wgrywa lönespec (PDF lub zdjęcie) per pracownik i miesiąc,
  pracownik widzi wyłącznie swoje. Podgląd pełnoekranowy (zdjęcie inline,
  PDF do otwarcia/pobrania), podmiana i usuwanie. Po wysłaniu pracownik
  dostaje powiadomienie „Twoja lönespec za … jest dostępna". Prywatny
  bucket `payslips`, RLS: pracownik-własne / admin-wszystkie (migracja 0019).
- **Pulpit**: pozioma belka „Specyfikacje wypłaty" pod kaflami (admin
  i pracownik); ikona budzika w „Czekają na zatwierdzenie" teraz dzwoni
  (animacja), żeby przycisk rzucał się w oczy.

## 0.11.0 — Etap 9: Pulpit finalny + offline; poprawki raportu (2026-07-11)

- **Raport**: box **„Zysk w tym miesiącu"** (do fakturowania − koszt pracy −
  paragony) pod górnymi kaflami; „niezatwierdzone" zamiast „szkic";
  „Otwórz podgląd" jako czytelny przycisk (nie zlewa się z tłem);
  X do zamknięcia podglądu raportu w aplikacji (?podglad=1). RPC
  report_hours zwraca teraz sumę paragonów okresu (migracja 0018).
- **Pulpit**: kafel „Nieopłacone faktury" z prawdziwych danych (suma
  niezapłaconych faktur, tylko finance_view) — zastępuje demo „Wartość
  w toku".
- **Tryb offline**: pasek „Brak połączenia — pokazujemy ostatnie dane"
  gdy telefon traci sieć; aplikacja działa dalej na zapisanym cache
  (TanStack Query persist). PWA: manifest, theme-color, ikony maskable,
  meta Apple — komplet.

## 0.10.1 — raport: porównanie miesięcy + udostępnianie linkiem (2026-07-11)

- Pod „Godziny w miesiącu" **porównanie z poprzednim miesiącem**
  (np. „+12 h vs 29 h w zeszłym", zielono/czerwono).
- **Udostępnij raport linkiem** (jak oferty): generujesz link, otwiera się
  bez logowania w szacie firmy (granatowy nagłówek z logo, godziny,
  do fakturowania, pracownicy z rozbiciem, projekty). Dane zamrożone
  w momencie utworzenia; przełącznik „Dołącz kwoty" (można udostępnić
  same godziny bez stawek). Migracja 0017 (tabela report_shares, RPC
  security definer; strona publiczna czyta tylko po tokenie).

## 0.10.0 — Etap 8: Raporty (2026-07-11)

- **Moduł Raporty**: zestawienie godzin miesiąca (nawigacja strzałkami).
- **Zakładka Pracownicy**: suma godzin per pracownik z rozbiciem na projekty
  (rozwijane), statusy (zatwierdzone/szkic), koszt pracy przy finance_view —
  gotowe pod wypłaty.
- **Zakładka Projekty**: godziny per projekt, liczba pracowników, stawka
  klienta i **wartość do fakturowania** (godziny × stawka) przy finance_view.
- Nagłówek z sumą godzin i sumą „Do fakturowania" (+ koszt pracy).
- **Udostępnij / kopiuj raport**: gotowy tekst zestawienia (share lub schowek).
- Kwoty liczone w RPC `report_hours` (security definer): stawki pracowników
  nie opuszczają bazy; dostęp reports_view lub finance_view (migracja 0016).

## 0.9.6 — więcej ikon + czystszy hero oferty (2026-07-11)

- Rejestr ikon usług rozszerzony do ~75 pozycji, w tym **murowanie**
  (BrickWall), kilof, łopata, wiertarka, spoiny, farby, natrysk itd.
- Strona oferty: usunięta pastylka z numerem oferty w hero (numer jest
  niżej w „Offertnummer") i slogan pod logo — czystszy nagłówek.

## 0.9.5 — usługi z wyborem ikon + modal Avböj + opis firmy od właściciela (2026-07-11)

- **Usługi w Ustawieniach jako lista**: każda w osobnym wierszu, z wyborem
  ikonki z pełnego rejestru ~36 ikon aplikacji (tap w ikonkę → siatka),
  dodawanie i usuwanie pozycji; koniec wpisywania po przecinku.
- **„Avböj offerten" w modalu**: pole na wiadomość wyskakuje w oknie na
  środku ekranu (jak potwierdzenie akceptacji), nie w treści strony.
- Opis „Om BFTM" podmieniony na tekst właściciela (edytowalny dalej
  w Ustawieniach); plakietki F-skatt/Försäkrade znów obok siebie.
- Usunięte myślniki „—" z tekstów widocznych dla klienta.

## 0.9.4 — podgląd szkicu + kontakty imienne + specyfikacja v3 (2026-07-10)

- **Podgląd przed wysłaniem**: „Podgląd oferty klienta" dostępny od razu po
  zapisaniu szkicu (token bez zmiany statusu, migracja 0015); na podglądzie
  szkicu żółty pasek „Förhandsvisning — offerten är inte skickad än".
- **„Bra att veta" dopisuje zdania**: gdy w polu jest sama liczba, klient
  widzi pełny tekst („5" → „5 års garanti på utfört arbete", „550" →
  „ÄTA-arbeten debiteras 550 kr/tim…", dojazd → „…kr per arbetsdag").
- **Specyfikacja v3**: bez kółek z numerami — mała etykieta ARBETE (czerwona)
  / MATERIAL (szara) nad opisem, pod spodem ilość × cena i kwota.
- **Dwa telefony z imionami**: Tomasz 079-031 08 27 i Mateusz 072-852 55 21
  na stronie oferty; edycja w Ustawienia → Firma (Kontakt 1/2).
- Usługi: Tätskikt zamiast Målning; nowy, ludzki opis firmy po szwedzku
  (edytowalny); plakietki F-skatt/Försäkrade jedna pod drugą.

## 0.9.3 — pola informacyjne oferty + strona premium v2 (2026-07-10)

- **Nowe pola oferty** (jak w starym systemie): gwarancja (garanti), prace
  dodatkowe (ÄTA-arbeten), dojazd (reseräkning), termin płatności (dni),
  komentarze dla klienta — karta „Informacje dla klienta" w edytorze,
  na stronie klienta sekcja **„Bra att veta"** z ikonami (migracja 0014).
- **Podgląd z aplikacji**: przycisk X do zamknięcia i **nie nabija licznika
  wyświetleń** — licznik rośnie tylko z linku klienta.
- **Akceptacja z potwierdzeniem**: tap w „Acceptera offerten" otwiera modal
  „Är du säker?" z kwotą — koniec przypadkowych akceptacji.
- **Om oss po ludzku**: opis firmy i lista usług (z ikonkami) edytowalne
  w Ustawienia → Firma — nic nie jest zaszyte w kodzie.
- Logo w hero jeszcze większe; specyfikacja przestronniejsza (opis osobno,
  ilość×cena i kwota w osobnej linii, plakietka „arbete").

## 0.9.2 — strona oferty w wersji premium (2026-07-10)

- Publiczna strona oferty przeprojektowana w stylu prezentacji produktów:
  duże logo na granatowym hero z poświatą i animowanym wejściem, pastylka
  z numerem, wielki tytuł, „Förberedd för {klient}".
- Płynne animacje: sekcje wjeżdżają przy przewijaniu (IntersectionObserver),
  kwota „Att betala" nabija się licznikiem na granatowym pasie.
- Numerowana specyfikacja, karty z miękkimi cieniami, czerwona wstęga marki.
- Przyklejony dolny pasek „Acceptera offerten" z rozmyciem tła (safe-area).
- Sekcja „Om firmie": opis firmy, adres, telefon, e-mail, www + plakietki
  „Godkänd för F-skatt" i „Försäkrade arbeten"; stopka z org.nr/momsreg.

## 0.9.1 — naprawa „Wyślij klientowi" + czytelne przełączniki + licznik wyświetleń (2026-07-10)

- **Naprawione „Wyślij klientowi"**: generator tokenów (pgcrypto) żyje
  w schemacie extensions, a funkcja publikacji go nie widziała — migracja
  0013 naprawia ścieżkę; publikacja przetestowana na bazie.
- **Przełączniki mają wreszcie etykiety**: komponent Switch renderował
  opis tylko dla czytników ekranu. Sekcja „Podatki i odliczenia" i pozycja
  oferty tłumaczą teraz ludzkim językiem, co robi każdy suwak.
- **Licznik wyświetleń oferty**: każde otwarcie linku zliczane; edytor
  pokazuje „Otwarta przez klienta X razy (pierwszy raz …)", lista „otwarta
  X razy".
- Pola rozmiarów w karcie pracownika: schludny focus (ring w kolorze
  akcentu zamiast łamanego obrysu systemowego).

## 0.9.0 — Etap 7: Oferty z publicznym linkiem dla klienta (2026-07-10)

- **Kreator ofert**: tytuł, klient (ROT/omvänd byggmoms podpowiadane z karty
  klienta), pozycje (ilość × cena, jednostka, moms, flaga robocizny), sumy
  na żywo z ROT-avdrag (30%, limit 50 000 kr/os. — z ustawień), numeracja
  OF-2026-NNN z licznika, statusy Szkic/Wysłana/Zaakceptowana/Odrzucona.
- **Publiczna strona oferty** pod niezgadywalnym tokenem — po szwedzku,
  w szacie firmowej jak dotychczasowy system bftm.se (granatowy nagłówek
  z logo i sloganem, czerwony pasek „Offert för:", specyfikacja, sumy
  z moms/ROT, „Kontakta oss", stopka z org.nr/F-skatt). Klient może
  **zaakceptować lub odrzucić** ofertę (z komentarzem) — właściciele
  dostają powiadomienie w aplikacji; widać też, kiedy klient otworzył link.
- **Udostępnianie**: kopiuj link / natywne „Udostępnij" / e-mail po szwedzku
  z gotową treścią (jak z obecnego systemu) i linkiem.
- Bezpieczeństwo: klient niczego nie czyta z tabel — wyłącznie RPC
  security definer po tokenie (migracja 0012); szkice niedostępne publicznie.

## 0.8.4 — podgląd zdjęć: swipe między zdjęciami + dialog na wierzchu (2026-07-10)

- Pełnoekranowy podgląd zdjęcia: swipe lewo/prawo przegląda zdjęcia projektu
  (z licznikiem „3 / 12") i nie przełącza już zakładek aplikacji.
- Dialog „Usunąć zdjęcie?" wyświetla się nad pełnoekranowym podglądem,
  a nie pod nim (podniesiony z-index wszystkich dialogów potwierdzenia).

## 0.8.3 — koszt pracy zgodny z lönespecifikation (2026-07-10)

- Koszt godziny liczony **jak na wypłacie**: brutto + arbetsgivaravgifter
  (×1,3142). Zweryfikowane na realnej specyfikacji: 170 h × 210 kr →
  46 917 kr kosztu (payslip: 47 250 — różnica to AGA od förmån, których
  aplikacja nie śledzi). Migracja 0011.
- Semesterersättning przestało być doliczane do każdej godziny — pracownicy
  mają semesterdagar, urlop kosztuje przy odbiorze. Nowy przełącznik
  w Ustawieniach → Finanse: „Doliczaj rezerwę urlopową do kosztu godziny"
  (pełny koszt ekonomiczny, np. do kalkulacji ofert) — domyślnie wyłączony.

## 0.8.2 — Ustawienia → Finanse: narzuty pracodawcy (2026-07-10)

- Nowa sekcja **Finanse — koszt pracodawcy** w Ustawieniach (tylko
  właściciel): arbetsgivaravgifter %, semesterersättning %, dodatkowy
  narzut firmy % — z podglądem na żywo mnożnika i przykładem
  („stawka 200 kr/h → X kr/h"). Zapis od razu przelicza raporty Finanse.

## 0.8.1 — fakturowanie etapami + rozmiary w karcie pracownika (2026-07-10)

- **Wiele faktur na projekt** (fakturowanie etapami): każda faktura z kwotą,
  opisem etapu, datą wysłania, terminem i datą opłacenia; lista w sekcji
  „Finanse projektu" z dodawaniem/edycją/oznaczaniem opłaconych/usuwaniem;
  linia „Zafakturowane X z Y". Raport Finanse sumuje wszystkie faktury
  (czeka na płatność / opłacone w okresie); tabela project_invoices
  z RLS finance_view (migracja 0010, dane z 0008 przeniesione).
- Karta pracownika (właściciel): personnummer i **rozmiary robocze**
  (koszulka/spodnie/buty) widoczne i edytowalne — to samo, co pracownik
  uzupełnia w swoim profilu.

## 0.8.0 — Finanse na żywo + Mój profil + poprawki UI (2026-07-10)

- **Zakładka Finanse** (dawne Koszty): zysk okresu na żywo (wypracowane −
  koszty), kafle Wypracowane / Koszty / Czeka na płatność / Opłacone,
  wykres słupkowy przychód vs koszty (tydzień: dni, miesiąc: tygodnie ISO),
  donut struktury kosztów wg projektów, lista rentowności projektów.
  Paragony przeniesione na podstronę Finanse → Paragony (nic nie zginęło).
- **Koszt pracy = pełny koszt pracodawcy**: stawka × narzuty z Ustawień
  (arbetsgivaravgift 31,42% + semesterersättning 12% — edytowalne). Kwoty
  liczone w bazie (RPC security definer) — stawki pracowników nie opuszczają
  serwera; dostęp wymaga uprawnienia finance_view (migracja 0008).
- **Fakturowanie projektu**: „Faktura wysłana" (kwota, data, termin +30 dni)
  → „Opłacona" (data wpływu); statusy widoczne w Finansach i na karcie
  projektu razem z żywym rozliczeniem wartość/koszty/zostaje.
- **Mój profil**: tap w swoje nazwisko w menu Więcej → telefon, personnummer
  i rozmiary robocze (koszulka/spodnie/buty) do samodzielnego uzupełnienia
  (migracja 0009 — każdy widzi wyłącznie własne dane).
- Rola „admin" prezentowana jako **Właściciel**; pracownik widzi w menu swój
  e-mail zamiast etykiety „Pracownik".
- Powiadomienie o zatwierdzonych godzinach w czytelnych liniach (tydzień /
  daty / suma godzin).
- Plus (FAB) już nie „skacze" przy przełączaniu zakładek — przypięty na
  sztywno w prawym dolnym rogu.
- Usunięte instruktażowe opisy przy pustych sekcjach karty projektu.

## 0.7.0 — Etap 6: Koszty + Prace dodatkowe + Zdjęcia (2026-07-09)

- Moduł Koszty: nawigacja miesiącami z sumą, chipsy kategorii (Materiały/
  Sprzęt/Paliwo/Podwykonawca/Inne), filtr projektu, autouzupełnianie
  netto ↔ VAT ↔ brutto, zdjęcie paragonu z aparatu (kompresja do ~1600 px,
  prywatny bucket, podgląd przez podpisany URL), edycja/usuwanie wg uprawnień.
- Prace dodatkowe na karcie projektu: statusy Zaproponowana/Zaakceptowana/
  Odrzucona/Rozliczona, suma zaakceptowanych (finance_view), CRUD w sheet.
- Zdjęcia projektu: siatka 3 kolumny, multi-upload z kompresją, podgląd
  pełnoekranowy z usuwaniem (autor lub admin).
- Karta projektu: sekcja Koszty (suma brutto + rozbicie wg kategorii,
  szybkie dodawanie z przypiętym projektem).
- Pulpit: kafel „Koszty w tym miesiącu" liczy prawdziwe dane.

## 0.6.1 — stały górny pasek + personnummer + płynne przejścia (2026-07-09)

- Stały górny pasek na każdej zakładce: tytuł strony + dzwoneczek powiadomień
  (przypięty, nie przewija się z treścią); usunięte zdublowane nagłówki stron.
- Personnummer pracownika: pole przy tworzeniu konta i edytowalne w profilu;
  przechowywany w osobnej tabeli z RLS tylko-dla-admina (migracja 0007).
- Powiadomienia z ikonami wg typu (zatwierdzone godziny — zielony check,
  nieobecność, ogłoszenie, info).
- Płynne przejścia między zakładkami: lekki swipe (24 px) działa na całym
  ekranie, strona wjeżdża z animacją z właściwej strony (także przy tapnięciu
  w dolny pasek).

## 0.6.0 — system powiadomień + pulpit 2.0 (2026-07-09)

- **Powiadomienia**: dzwoneczek w prawym górnym rogu z czerwonym licznikiem
  nieodczytanych; panel wysuwany z listą; otwarcie oznacza jako przeczytane.
  Pierwszy typ: „Twoje godziny za okres … zostały zatwierdzone (X h)" przy
  zatwierdzaniu godzin (migracja 0006, RLS: odbiorca widzi swoje).
- Pulpit admina: pomarańczowy blok „Czekają na zatwierdzenie" (liczba wpisów
  + suma godzin, tap prowadzi do dziennika).
- Pulpit pracownika: nowoczesna karta powitalna z gradientem i przyciskiem
  „Dodaj dzisiejsze godziny"; sekcja „Ostatnie 7 dni" — każdy dzień pod sobą
  z sumą i projektami (puste dni wyszarzone).
- „Duplikuj na dziś": otwiera formularz nowego wpisu wypełniony jak wzór
  (projekt, aktywność, godziny, opis) z dzisiejszą datą — do edycji przed
  zapisem (koniec błędu duplikatu przy starym Duplikuj).

## 0.5.4 — poprawki z testów dziennika (2026-07-09)

- Status „Szkic" przemianowany na „Niezatwierdzone" (badge przy każdym wpisie
  na liście i w szczegółach dnia).
- Nagłówek kolumny sum w dzienniku: „Suma" zamiast „Σ".
- Edycja zatwierdzonego/rozliczonego dnia poprzedzona ostrzeżeniem
  „Dzień już zatwierdzony — edytować mimo to?".
- Modal zatwierdzania: suma godzin pracownika + każdy dzień z osobna
  + dni nieobecności wg typu (przewijana lista).
- Pulpit pracownika: sekcja „Twój dzień" z własnymi wpisami i przyciskiem
  dodania godzin (zamiast „Nikt jeszcze nie wpisał…").
- Pracownik przy zatwierdzonym wpisie widzi komunikat „Nie możesz edytować
  dni, które zostały już zatwierdzone do wypłaty".
- Rozliczenie projektu (timmar/fast pris + stawki) ukryte przed osobami
  bez uprawnienia finansowego.
- Usunięte stare wpisy godzin bez przypisanej aktywności (baza).

## 0.5.3 — dopracowanie dziennika i aktualizacji (2026-07-09)

- „Sprawdź aktualizację" działa naprawdę: aktywnie pyta serwer o nową wersję;
  jeśli jest — modal z przyciskiem „Zainstaluj i odśwież"; jeśli nie — komunikat
  o aktualnej wersji.
- Przewijanie siatki dziennika nie przełącza już zakładek aplikacji.
- Zatwierdzanie godzin z modalem podsumowania: pracownik → godziny + dni
  nieobecności wg typu w okresie, dopiero potem zatwierdzenie.
- Komórki dziennika: czerwone = szkice, zielone = zatwierdzone do wypłaty
  (+ legenda pod siatką).
- Szczegóły dnia w dzienniku: edycja wpisu ołówkiem wprost z komórki;
  nieobecność jako czytelna karta w kolorze typu (zamiast szarego badge'a).

## 0.5.2 — aktywności projektów + poprawki UX (2026-07-09)

- **Aktywności projektów**: na karcie projektu sekcja Aktywności (np. etapy,
  usługi); pracownik przy dodawaniu godzin wybiera projekt → aktywność
  (wymagana, gdy projekt jakieś ma); admin widzi podsumowanie „kto co robił
  i ile godzin" per aktywność; aktywność widoczna na listach i w dzienniku.
  Unikalność wpisu dnia rozszerzona o aktywność (migracja 0005).
- Ikona projektów zmieniona z kasku na domek w całej aplikacji.
- Jeszcze czulszy swipe między zakładkami (28 px, lekki gest).
- E-mail klienta wyeksponowany w formularzu z podpowiedzią (wysyłka ofert
  i wizualizacji w przyszłych etapach).
- Kalendarz zakresu nieobecności, numer tygodnia, naprawa pustych list —
  patrz 0.5.1 (hotfix wdrożony wcześniej tego dnia).

## 0.5.0 — Etap 5: Godziny + Dziennik + Nieobecności (2026-07-09)

- Dodawanie godzin: sheet ze stepperem ±0,5 h, skróty Dziś/Wczoraj, ostatnio
  używane projekty na górze listy, „Zapisz i dodaj kolejny"; admin wpisuje
  za dowolnego pracownika.
- Dziennik: siatka pracownicy × dni (tydzień/miesiąc, nawigacja okresów),
  sumy dzienne i na pracownika, kolorowe oznaczenia nieobecności, tap w
  komórkę → szczegóły dnia; filtr projektu.
- Lista wpisów pogrupowana po dniach z akcjami edytuj/duplikuj/usuń wg
  uprawnień; wpisy rozliczone chronione.
- Zatwierdzanie szkiców z okresu jednym przyciskiem (hours_approve).
- Nieobecności: zgłaszanie zakresu (chorobowe/urlop/bezpłatny/VAB/inne),
  lista okresu, ostrzeżenia o kolizji godzin z nieobecnością (w obie strony).
- Pulpit: prawdziwe KPI godzin miesiąca, sekcja „Dziś w pracy" (kto wpisał
  godziny, kto nieobecny), ostatnie 5 wpisów, FAB dodaje godziny.
- Karta projektu: sekcja Godziny — suma, pasek postępu vs budżet (czerwony
  po przekroczeniu), podział na pracowników, szybkie dodawanie.
- Projekty: etykiety rozliczeń Timmar / Fast pris / Mieszane, 16 kolorów.

## 0.4.0 — Etap 4: Klienci + Projekty (2026-07-09)

- Moduł Klienci: lista z wyszukiwarką i badge'ami (Firma/Prywatny, omvänd
  byggmoms, ROT), karta klienta z danymi kontaktowymi i projektami,
  CRUD w sheetach z sensownymi domyślnymi dla Szwecji.
- Moduł Projekty: lista kart z paskiem koloru i segmentami statusów
  (Aktywny/Oferta/Wstrzymany/Zakończony/Anulowany + liczniki), wyszukiwarka,
  formularz (klient, typ rozliczenia, stawka/ryczałt, budżet godzin, daty,
  kolor, opis), szczegóły z akcjami: edytuj, zmień status, usuń.
- Kolumny finansowe (stawka, ryczałt) nie trafiają nawet do zapytań
  użytkowników bez finance_view — filtrowanie w warstwie api.ts.
- Pulpit: kafel „Aktywne projekty" liczy prawdziwe dane; pozostałe KPI
  oznaczone „wkrótce".
- Poprawki: log logowań na zdarzeniu SIGNED_IN (wcześniej RLS po cichu
  odrzucał wpis), czulszy swipe między zakładkami (40 px).

## 0.3.0 — Etap 3: Pracownicy i uprawnienia (2026-07-09)

- Moduł Pracownicy: lista z wyszukiwarką, dodawanie kont (hasło tymczasowe
  pokazywane JEDEN raz z przyciskiem kopiuj), profil pracownika.
- Panel uprawnień: 18 flag pogrupowanych, z polskimi opisami i oznaczeniem
  danych wrażliwych; zapis natychmiastowy.
- Reset hasła przez admina (nowe hasło tymczasowe + wymuszenie zmiany +
  unieważnienie sesji), dezaktywacja/reaktywacja konta (ban w Auth).
- Stawka godzinowa z historią (valid_from) — tylko admin.
- Dziennik aktywności konta: logowania i operacje administracyjne
  (utworzenie, resety, dezaktywacje) — widoczny dla admina.
- Nawigacja (dolny pasek, menu Więcej) i trasy filtrowane uprawnieniami.
- Migracja 0003: funkcje RPC admin_create_employee / admin_reset_password /
  admin_set_active (security definer, twardy warunek is_admin).
- Wymuszona zmiana hasła przy pierwszym logowaniu obowiązuje też pracowników
  (ten sam mechanizm co u admina — nie do ominięcia).

## 0.2.1 — poprawki UX po testach na telefonie (2026-07-08)

- Szare tło aplikacji (#F2F2F5) — białe karty wyraźnie odcinają się od tła.
- „Więcej" jako nowoczesne slide-in menu z prawej (gest zamykania) zamiast
  osobnej strony.
- Swipe w lewo/prawo przełącza sąsiednie zakładki dolnej nawigacji.
- Niższa dolna belka nawigacji — mniej pustej przestrzeni.
- Duże logo firmy na całej szerokości ekranu logowania.
- Slogan firmy pod nazwą na ekranie logowania — edytowalny w Ustawienia → Firma.

## 0.2.0 — Etap 2: Supabase + Auth (2026-07-08)

- Backend BFTM: migracja 0001 (14 tabel, funkcje is_admin/has_perm, RLS na
  wszystkich tabelach, buckets logos/receipts/project-photos, seed settings ze
  zweryfikowanymi stawkami 2026) + migracja 0002 (hardening funkcji i storage).
- Konto administratora z hasłem startowym i wymuszoną zmianą przy pierwszym
  logowaniu; mapowanie loginu „admin" na e-mail administratora.
- Prawdziwe logowanie Supabase Auth (SessionProvider, guard tras, wylogowanie
  z czyszczeniem cache, polskie komunikaty błędów); usunięta atrapa z Etapu 1.
- Ustawienia: sekcja Firma (dane firmy, upload logo — widoczne na ekranie
  logowania), Moje konto (zmiana hasła), Sprawdź aktualizację.
- Ręcznie utrzymywane typy bazy `src/types/database.ts`; Edge Functions
  bootstrap-admin / create-employee / reset-employee-password w repo.

## 0.1.0 — Etap 1: Fundament (2026-07-08)

- Scaffold Vite + React + TypeScript (strict) + Tailwind CSS v4 z design tokens
  (#CC0000, skala 13–30, radius 16/10, cienie kart).
- Biblioteka komponentów UI: Button, Card, Input/Textarea, Select, DateField,
  NumberStepper, Badge, Tabs, ListRow/ListGroup, EmptyState, Skeleton, Toast, FAB,
  Avatar, SegmentedControl, SearchBar, Chips, Sheet (gest przeciągnięcia), ConfirmDialog.
- Rejestr modułów + HashRouter + AppLayout z dolną nawigacją (Pulpit • Projekty •
  Godziny • Oferty • Więcej) i ekranem „Więcej".
- Atrapa ekranu logowania (prawdziwe Supabase Auth w Etapie 2), guard tras, Error Boundary.
- TanStack Query z persystencją cache do localStorage (fundament „zero ładowania").
- PWA: manifest, ikony (generator `scripts/generate-icons.mjs`), service worker
  z promptem aktualizacji, strategie cache dla Supabase REST/Storage.
- Workflow deploy na GitHub Pages (`.github/workflows/deploy.yml`).
- Dokumentacja: README, docs/ARCHITECTURE.md, docs/MODULES.md.
