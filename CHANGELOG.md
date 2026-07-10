# Changelog

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
