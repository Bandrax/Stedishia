# Sthedisia (MojNovčanik)

Mobilna aplikacija za vođenje kućnih financija za dvočlano kućanstvo.

## Projekt info
- **Repo**: https://github.com/Bandrax/Stedishia
- **Branch**: master
- **Lokacija**: `D:/Program Files/Sthedisia/MojNovcnik/`

## Tech stack
- React Native + Expo SDK 54, TypeScript strict
- Zustand (state management)
- expo-sqlite (lokalna baza)
- React Navigation v7 (bottom tabs + stack)
- react-native-chart-kit (grafovi)
- @expo/vector-icons (Ionicons) — SVE ikone su Ionicons, nikad emoji za UI
- i18next (hr primarni, en sekundarni)
- React Hook Form + Zod (forme)
- date-fns (datumi, hr locale)
- expo-crypto (UUID generacija)
- expo-notifications (lokalne notifikacije)
- expo-file-system, expo-sharing, expo-document-picker (sync)

## Arhitektura
- **Korisnici**: Dvočlano kućanstvo (korisnik Android + djevojka iPhone)
- **Scope**: Sve transakcije su osobne (scope sustav uklonjen)
- **Sync**: JSON export/import putem dijeljenja (Google Drive, AirDrop)
- **AI savjeti**: Potpuno lokalno (pravila + heuristike)
- **Dizajn**: #0F4C3A primarna, #D4AF37 akcent, dark/light auto tema
- **Ikone**: Ionicons iz @expo/vector-icons; kategorije imaju dva stila ikona (Klasične=emoji, Moderne=Ionicons) — odabir u Settings
- **Datumi**: Prikaz u dd.MM.yyyy formatu, interno YYYY-MM-DD (ISO)

## Navigacija
- TabNavigator: Home, Transactions, Budget, Goals, More (sve Ionicons, i18n labele)
- MoreScreen -> Reports, Accounts, Advisor, Household, RecurringPayments, Settings

## Kategorije

### Rashodi (14 kategorija)
| ID | HR | EN | Emoji | 50/30/20 grupa | Postotak |
|---|---|---|---|---|---|
| housing | Stanovanje | Housing | 🏠 | Potrebe | 25% |
| food | Hrana i piće | Food & Drinks | 🍽️ | Potrebe | 13% |
| transport | Prijevoz | Transport | 🚗 | Potrebe | 5% |
| utilities | Režije | Utilities | 💡 | Potrebe | 3% |
| health | Zdravlje | Health | 🏥 | Potrebe | 2% |
| appliances | Bijela tehnika | Home Appliances | 🧊 | Potrebe | 2% |
| entertainment | Zabava | Entertainment | 🎬 | Želje | 10% |
| clothing | Odjeća | Clothing | 👕 | Želje | 5% |
| personal | Osobno | Personal | 🧴 | Želje | 5% |
| education | Edukacija | Education | 📚 | Želje | 3% |
| gifts | Pokloni | Gifts | 🎁 | Želje | 5% |
| used_purchase | Kupovina polovnog | Used Purchase | 🏷️ | Želje | 2% |
| debt | Otplata kredita | Debt Payment | 🏦 | Štednja | 10% |
| other_expense | Ostalo | Other | 📌 | Štednja | 10% |

**Ukupno: 100%** (Potrebe 50%, Želje 30%, Štednja 20%)

### Prihodi (9 kategorija)
salary, freelance, bonus, investment_income, rental_income, business_income, association_income, used_sale, other_income

### Posebne kategorije
- `transfer` — za prikaz transfera u listi (nije rashod)
- `savings` — legacy, zadržana za stare transakcije

### Lokalizacija kategorija
- `getCategoryInfo()` u `dashboardService.ts` vraća `name` ili `nameEn` ovisno o `i18n.language`
- Kategorije imaju `name` (HR) i `nameEn` (EN) field u `Category` interfaceu
- Potkategorije isto imaju `name`/`nameEn`

### Auto-kategorizacija (autoCategory.ts)
- Keyword-based pravila za sve kategorije
- appliances: perilica, hladnjak, sušilica, Gorenje, Bosch, Electrolux, blender, toster, itd.
- used_purchase: polovno, rabljeno, polovni auto, rabljeni monitor, second hand, itd.
- used_sale (prihod): prodao, prodala, prodano, prodaja auta, sold, itd.
- Fallback: `suggestFromHistory()` — traži sličan opis u prošlim transakcijama

## Budget sustav

### Dva moda
1. **Envelope (Kuverte)** — ručna raspodjela po kategoriji
2. **50/30/20** — automatska raspodjela prema preporučenim postocima
- Zadani prikaz se bira u Settings ("Zadani prikaz budžeta") — `defaultBudgetView` u `useSettingsStore`
- Oba moda uvijek dostupna, postavka samo određuje koji se prikaže pri otvaranju Budget taba

### Budget baza (fallback logika — SAMO za interni izračun alokacija)
```
effectiveBase = income > 0 ? income : totalAllocated > 0 ? totalAllocated : balance + expenses
```
- `effectiveBase` se koristi SAMO za `availableToAllocate` i `generate503020Budget`
- NIKAD se ne prikazuje korisniku kao "prihod"
- Nikad ne koristi monthlyIncome iz profila

### BudgetSummaryHeader (2x2 grid)
- Mjesečni prihod (zeleno) — **stvarni SUM income transakcija za mjesec**
- Mjesečni rashodi (crveno) — **stvarni SUM expense transakcija za mjesec**
- Neto rezultat (zeleno/crveno) — **prihod - rashod (prava razlika)**
- Ukupno stanje (zlatno) — **SUM svih account balances**
- Nema progress bar (uklonjen jer je bio zbunjujući)

### 50/30/20 grupe
- **Potrebe**: housing, food, transport, utilities, health, appliances
- **Želje**: entertainment, clothing, personal, gifts, education, used_purchase
- **Štednja/Dugovi**: debt, other_expense
- Targeti koriste `groupAllocated()` iz DB alokacija, ne dinamički postotak

### Envelope funkcionalnosti
- +10/-10 i +50/-50 gumbi za alokaciju
- **Auto-balance**: postavlja allocated = ceil(spent) za overbudget kategorije
- **Preseti**: spremi/učitaj imenovane konfiguracije alokacija
  - DB tablica: `budget_presets` (id, user_id, name, allocations JSON, created_at)
  - `saveBudgetPreset()`, `getBudgetPresets()`, `loadBudgetPreset()`, `deleteBudgetPreset()`

## Ponavljajuća plaćanja sustav

### Koncept
Ponavljajuća plaćanja su **podsjetnici**, ne automatski rashodi. Tek kad korisnik stisne "Plaćeno" kreira se transakcija u rashodima. Status plaćenosti se prati po mjesecu pomoću `lastPaidDate`.

### DB tablica: `recurring_transactions`
```sql
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
account_id TEXT,              -- nullable
type TEXT NOT NULL,            -- 'expense' | 'income'
scope TEXT DEFAULT 'personal',
amount REAL NOT NULL,
category_id TEXT NOT NULL,
subcategory_id TEXT,
description TEXT NOT NULL,
frequency TEXT NOT NULL,       -- 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
start_date TEXT,
end_date TEXT,
next_due_date TEXT NOT NULL,
last_paid_date TEXT,           -- praćenje plaćenosti po mjesecu
is_active INTEGER DEFAULT 1,
auto_add INTEGER DEFAULT 0,
reminder_days_before INTEGER DEFAULT 1,
created_at TEXT NOT NULL
```

### Unificiran tip (`types/index.ts`)
```typescript
type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
interface RecurringTransaction {
  id, userId, accountId?, type, amount, categoryId, subcategoryId?,
  description, frequency, nextDueDate, lastPaidDate?, isActive, createdAt
}
```

### Servisne funkcije (`recurringService.ts`)
- `createRecurring()` — kreira novo ponavljajuće plaćanje
- `getRecurringTransactions(userId)` — sva plaćanja sortirana po nextDueDate
- `getRecurringById(id)` — dohvat po ID-u
- `updateRecurring(id, updates)` — parcijalni update
- `deleteRecurring(id)` — brisanje
- `toggleRecurring(id, isActive)` — pauziraj/aktiviraj
- `markAsPaid(id, amount, userId, accountId)` — **kreira transakciju** u rashodima + označi plaćeno + advance nextDueDate
- `markAsPaidOnly(id)` — **samo označi plaćeno** bez kreiranja transakcije (za već plaćene stavke)
- `isPaidThisMonth(tx)` — provjera je li lastPaidDate u tekućem mjesecu
- `advanceNextDueDate(frequency, currentDate)` — izračun sljedećeg datuma
- `advanceToFuture(frequency, date)` — advance do budućeg datuma (podržava propuštene mjesece)
- `getSubscriptionSummary(userId)` — sažetak pretplata (monthly/yearly totals)
- `getRecurringPaymentStatus(userId)` — za Dashboard widget (unpaid/overdue count, totalDue)

### UI funkcionalnosti (RecurringScreen)
- **Kreiranje**: opis, iznos, tip (rashod/prihod), kategorija (CategoryPicker), učestalost, dan u mjesecu
- **Uređivanje**: isti modal kao kreiranje, pre-populated podaci
- **Gumb "Plaćeno"**: otvara pay modal s dva načina:
  1. "Potvrdi plaćanje" — kreira transakciju u rashodima + označi plaćeno
  2. "Već plaćeno (bez rashoda)" — samo označi plaćeno (za stavke plaćene prije korištenja app)
- **Pay modal**: promjenjiv iznos (za varijabilne račune) + odabir računa
- **Overdue escalation**: >3 dana kasni = crveno "Hitno!", 1-3 dana = narančasto "Kasni!"
- **Paid status**: zelena "Plaćeno" oznaka kad je plaćeno za tekući mjesec
- **Summary kartica**: razdvojeni fiksni rashodi i prihodi (monthly + yearly)
- **Toggle**: pauziraj/aktiviraj s Switch komponentom
- **Akcijski gumbi**: Plaćeno, Uredi, Toggle, Obriši

### Dashboard integracija
- **Warning widget**: crvena/narančasta kartica kad ima neplaćenih/zakašnjelih plaćanja
  - Tap navigira na RecurringPayments ekran
  - Prikazuje ukupan iznos dospjelih plaćanja
  - `getRecurringPaymentStatus()` u `recurringService.ts`
- **Upcoming payments**: postojeća kartica za plaćanja u narednih 7 dana

### Notifikacije
- Payment reminders: 24h prije due date, 9:00 (Android kanal: 'payments', HIGH importance)
- `scheduleAllNotifications()` se poziva nakon svakog CRUD-a na recurring items
- Notification data: `{ type: 'payment_reminder', recurringId: tx.id }`

## Ciljevi sustav

### GoalCard
- Moderne ikone: `GOAL_EMOJI_IONICONS` mapping u `categoryIcons.ts`
- Emoji picker u GoalsScreen prikazuje Ionicons kad je `iconStyle === 'modern'`
- Akcijski gumbi: Dodaj novac, Uredi, Označi ostvarenim, Obriši
- Ostvareni ciljevi: collapsible sekcija s datumom ostvarenja
- Validacije: upozorenje kad target < current, upozorenje za datum u prošlosti
- Container je `View` (ne TouchableOpacity), akcije su zasebni gumbi

### Servisne funkcije (`goalService.ts`)
- `createGoal()`, `updateGoal()`, `addToGoal()`, `deleteGoalById()`
- `getGoals()`, `getNetWorth()`, `getEmergencyFundCoverage()`
- `calculateMonthlyNeeded(target, current, targetDate)` — izračun mjesečne štednje

## i18n sustav

### Potpuna internacionalizacija
- **Svaki** string u aplikaciji koristi `t()` (React) ili `i18n.t()` (servisi)
- 470+ prijevodnih ključeva u hr.json i en.json
- Pokriva: navigaciju, sve ekrane, onboarding, PIN, budžet, ciljeve, izvještaje, savjetnika, notifikacije, sync, recurring
- Language switcher u Settings (Hrvatski / English)

### Ključne sekcije u locale fajlovima
nav, common, dashboard, transactions, budget, goals, reports, settings, accounts, advisor, household, recurring, onboarding, auth, categories, notifications, sync, tips

### Kako dodati nove stringove
1. Dodaj ključ u `src/locales/hr.json` i `src/locales/en.json`
2. U React komponentama: `const { t } = useTranslation(); t('section.key')`
3. U servisima: `import i18n from '../locales/i18n'; i18n.t('section.key')`

## Valuta sustav

### Dinamička valuta (ne hardkodirani EUR)
- `src/store/useSettingsStore.ts` — Zustand store s `currency` stateom
- `CURRENCIES` array: EUR, USD, GBP, CHF, HRK, BAM, RSD, PLN, CZK, HUF
- Persisted u SQLite `app_settings` tablica (key-value)
- Module-level `_currentCurrency` za non-React pristup (servisi, formatteri)
- `getCurrentCurrency()` export za `formatAmount()`

### formatAmount logika
```typescript
formatAmount(amount, currency?, showSign?)
// currency defaults to getCurrentCurrency()
// locale from i18n.language ('hr' → 'hr-HR', 'en' → 'en-US')
// uses Intl.NumberFormat
```

### formatDate logika
```typescript
formatDate(dateStr, formatStr = 'dd.MM.yyyy', locale?)
// Prikaz: dd.MM.yyyy (dashes)
// Interno: YYYY-MM-DD (ISO)
// Koristi date-fns format() s hr/enUS locale
```

### Currency picker u Settings
- Tappable row → modal s listom valuta (kod, simbol, ime)
- Checkmark za odabranu valutu

## Icon sustav

### Dva stila
- **Klasične (classic)**: emoji ikone iz kategorija
- **Moderne (modern)**: Ionicons SVG ikone

### Implementacija
- `CategoryIcon` atom komponenta (`src/components/atoms/CategoryIcon.tsx`)
  - Čita `iconStyle` iz `useSettingsStore`
  - Renderira emoji `<Text>` ili `<Ionicons>` ovisno o postavci
- `categoryIcons.ts` (`src/constants/categoryIcons.ts`)
  - `CATEGORY_IONICONS` — mapping 23+ kategorija na Ionicons
  - `SUBCATEGORY_IONICONS` — mapping 30+ potkategorija
  - `GOAL_EMOJI_IONICONS` — mapping 14 goal emojija na Ionicons
  - `ADVISOR_EMOJI_IONICONS` — mapping 30+ advisor emojija na Ionicons
  - `getCategoryIonicon()`, `getSubcategoryIonicon()`, `getGoalIonicon()`, `getAdvisorIonicon()`
- `useSettingsStore` — `iconStyle`, `defaultBudgetView`, persistirano u `app_settings`
- Settings: sekcija "Stil ikona" s preview
- **Pokrivenost**: sve komponente poštuju iconStyle — Dashboard, Budget, Goals, Transactions, Reports, Advisor (savjeti, check-in, edukacija, pojmovnik), Onboarding, SelectableChip

## Izvještaji (ReportsScreen)

### Tabovi
1. **Mjesečni** — prihodi vs rashodi (LineChart), kategorije (PieChart), prihodi po izvoru
2. **Godišnji** — prihodi + rashodi LineChart s legendom
3. **Trendovi** — po kategoriji, tappable → fullscreen modal
4. **Prognoza** — projekcija 90 dana

### Period filter
- 1M / 3M / 6M / 1Y pills na mjesečnom tabu
- Kontrolira `getMonthlyOverview` i `getCategoryTrends`

### CSV export
- Gumb u headeru (download-outline ikona)
- `exportTransactionsCSV`, `exportMonthlyReportCSV`

## Notifikacije
- Payment reminders: 24h prije due date, 9:00
- Weekly budget check: ponedjeljak 9:00
- Monthly summary: 1. u mjesecu 10:00
- Android kanali: 'payments' (HIGH), 'tips' (DEFAULT)
- Sve poruke lokalizirane kroz i18n

## Mjesečni prijelaz sustav

### Koncept
Svakog prvog u mjesecu (ili kad se Dashboard otvori u novom mjesecu) automatski se:
1. Kreira snapshot prošlog mjeseca (prihodi, rashodi, neto, stanja računa, top kategorije, budget performance)
2. Kopiraju budget alokacije iz prošlog mjeseca u novi (ako novi mjesec nema alokacija)
3. Advance-aju nextDueDate za overdue recurring plaćanja

### Servis (`monthTransitionService.ts`)
- `ensureMonthTransition(userId)` — poziva se na Dashboard load
- `createMonthlySnapshot(userId, month)` — arhivira mjesec
- `getSnapshot(userId, month)` / `getAllSnapshots(userId)` — dohvat snapshotova

### DB tablica: `monthly_snapshots`
- id, user_id, month (YYYY-MM), total_income, total_expenses, net_result
- total_balance, savings_total, account_balances (JSON), top_categories (JSON)
- budget_performance (JSON), created_at
- UNIQUE(user_id, month)

### Dashboard integracija
- `LastMonthCard` — kartica sa sažetkom prošlog mjeseca (prihodi, rashodi, neto, % promjena)
- Advisor koristi snapshotove za mjesečne usporedbe (+20% rashodi, -10% rashodi, pad prihoda, rast štednje)

## SQLite tablice
- users, transactions, accounts, budgets, goals, recurring_transactions
- households (s invite_code), household_members
- budget_presets (id, user_id, name, allocations TEXT, created_at)
- monthly_snapshots (id, user_id, month, financijski podaci, created_at)
- app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)

### Migracije (u database.ts)
- `invite_code` u households
- `app_settings` tablica
- `budget_presets` tablica
- `to_account_id` u transactions
- `last_paid_date` u recurring_transactions
- `account_id` nullable u recurring_transactions (rekreacija tablice)
- `monthly_snapshots` tablica

## Implementirane faze

### Faza 1-11: Kompletna implementacija
1. Temelji (Expo, Zustand, SQLite, navigacija)
2. Onboarding 7-step wizard + PIN/biometrija
3. Dashboard (BalanceCard, Semaphore, BudgetProgress, CashFlow, Tips)
4. Transakcije (AddTransaction, lista, filteri, autoCategory)
5. Budget (Envelope + 50/30/20, staklenke, upozorenja)
6. Ciljevi (GoalCard, NetWorth, EmergencyFund)
7. Izvještaji (mjesečni/godišnji/trendovi/prognoza)
8. Računi i dugovi (snowball/avalanche, pretplate)
9. AI savjetnik (personalizirani savjeti, check-in, edukacija)
10. Kućanstvo i sync (export/import JSON)
11. Polish (Settings, seedData, 25 unit testova)

### Post-faze: UI Polish
- Zamjena SVIH emoji ikona s Ionicons (~50 datoteka)
- Fix text overflow (numberOfLines, flex, flexShrink)
- uuid -> expo-crypto migracija
- Onboarding redesign, Dashboard fix, Back navigacija

### Post-faze: Connectivity + Notifikacije
- AccountPicker: fix icon rendering (Ionicons umjesto teksta)
- AccountsScreen: edit/delete računa s cascade deletion transakcija
- GoalsScreen: "Dodaj u štednju" bira račun i stvara pravu transakciju
- AddTransactionScreen: auto-load računa iz DB ako store prazan
- useFocusEffect na svim ekranima za auto-refresh
- App branding: ime "Sthedisia", custom ikona (zlatni novčić sa S)
- HTML manual: manual.html (12 sekcija, kompletni vodič)

### Post-faze: Budget sustav refactor
- 50/30/20 postoci prema stručnjacima (Elizabeth Warren): ukupno 100%
- Budget baziran na ukupnom stanju računa (ne monthlyIncome iz profila)
- Gumb "Regeneriraj 50/30/20" za resetiranje na preporučene postotke
- BudgetSummaryHeader: 4 metrike u 2x2 gridu
- StatusSemaphore interaktivan: tap otvara modal s detaljima i objašnjenjem
- Auto-balance gumb: allocated = ceil(spent) za overbudget kategorije
- Budget preseti: spremi/učitaj imenovane konfiguracije alokacija

### Post-faze: Kompletna i18n + valuta
- Zamjena SVIH hardkodiranih hrvatskih stringova s t() pozivima (~20 ekrana, svi servisi)
- Language switcher u Settings (Hrvatski / English)
- 470+ prijevodnih ključeva, savršeno usklađena hr.json i en.json
- Dinamička valuta — 10 podržanih valuta, picker u Settings
- formatAmount koristi Intl.NumberFormat s dinamičkim locale + currency
- Notifikacije, sync, advisor savjeti — sve lokalizirano

### Post-faze: Grafovi overhaul — Izvještaji + Dashboard
- Dashboard MiniCashFlowChart: tappable → fullscreen modal s većim grafom
- Izvještaji — LineChart umjesto BarChart za prihode vs rashode
- Izvještaji — Godišnji: prihodi I rashodi + legenda
- Izvještaji — Trendovi: tappable → fullscreen modal + statistike
- Izvještaji — Period filter (1M/3M/6M/1Y)
- Izvještaji — Prihodi po izvoru (income breakdown)

### Post-faze: Kategorije proširenje
- 3 nova prihoda: rental_income, business_income, association_income
- 1 novi rashod: appliances (Bijela tehnika / Home Appliances) s 3 potkategorije
- Auto-kategorizacija za appliances (30+ ključnih riječi HR+EN)

### Post-faze: Kategorija polovnih stvari + Icon stil
- Rashod `used_purchase` (Kupovina polovnog) s 5 potkategorija
- Prihod `used_sale` (Prodaja polovnog) s 5 potkategorija
- Auto-kategorizacija za polovno (kupovina + prodaja, 30+ ključnih riječi HR+EN)
- Budget: used_purchase 2% u grupi Želje (education smanjeno na 3%)
- Dva stila ikona kategorija: Klasične (emoji) i Moderne (Ionicons)
- `CategoryIcon` atom, `categoryIcons.ts`, `useSettingsStore` s `iconStyle`
- Ažurirano ~12 komponenti za podršku oba stila ikona

### Post-faze: Ciljevi sustav poboljšanje
- GoalCard moderne ikone: `GOAL_EMOJI_IONICONS` mapping
- Fix account icon bug u GoalsScreen add money modalu
- Uređivanje cilja: edit modal s pre-populated podacima
- Ručno označavanje cilja ostvarenim s potvrdom
- GoalCard akcijski gumbi: Dodaj, Uredi, Označi ostvarenim, Obriši
- Ostvareni ciljevi: collapsible sekcija s datumom ostvarenja
- Validacije: target < current upozorenje, datum u prošlosti upozorenje
- Emoji picker u goal modalu prikazuje Ionicons u modernom modu

### Post-faze: Datumi fix
- Svi datumi u aplikaciji prikazuju dd.MM.yyyy format (dashes)
- `formatDate()` default promijenjen iz `dd.MM.yyyy.` u `dd.MM.yyyy`
- `formatRelativeDate()` fallback ažuriran na `dd.MM.yyyy`
- GoalCard completedOn koristi default format umjesto eksplicitnog

### Post-faze: Ponavljajuća plaćanja overhaul
- Kompletni rewrite RecurringScreen s novim UI i funkcionalnostima
- **Gumb "Plaćeno"** — kreira transakciju u rashodima kad se stisne
- **"Već plaćeno (bez rashoda)"** — samo označi plaćeno bez rashoda
- **Uređivanje plaćanja** — edit gumb, isti modal pre-populated
- **Category picker** — odabir kategorije kod kreiranja/uređivanja
- **Praćenje plaćenosti** — `lastPaidDate` kolumna, auto-reset po mjesecu
- **Auto-advance nextDueDate** — pomak na sljedeći ciklus nakon plaćanja
- **Dashboard warning widget** — crvena/narančasta kartica za neplaćena/zakašnjela
- **Overdue escalation** — >3 dana = crveno "Hitno!", 1-3 = narančasto "Kasni!"
- **Razdvojeni fiksni troškovi/prihodi** u summary kartici
- **Fix hardkodiranih stringova** — svi stringovi kroz i18n
- **Unificiran RecurringTransaction tip** — jedan izvor istine u `types/index.ts`
- DB migracija: `last_paid_date TEXT` kolumna
- 18 novih i18n ključeva (hr + en)

### Post-faze: Budget summary fix
- BudgetSummaryHeader sada prikazuje **stvarne** prihode i rashode (SUM iz transactions tablice)
- Prije je "Mjesečni prihod" prikazivao `effectiveBase` (totalBalance + expenses) što je davalo lažne brojke
- `effectiveBase` sada korišten SAMO interno za budget alokacije (availableToAllocate, 50/30/20 generiranje)
- Neto rezultat = stvarni prihod - stvarni rashod
- Uklonjen progress bar na dnu headera (bio zbunjujući, prikazivao "rashod/effectiveBase")

### Post-faze: Mjesečni prijelaz + StatusSemaphore fix
- Kompletni month transition sustav: snapshots, budget copy, recurring advance
- `monthly_snapshots` DB tablica s financijskim podacima po mjesecu
- `monthTransitionService.ts` — `ensureMonthTransition()` poziv na Dashboard load
- `LastMonthCard` komponenta na Dashboardu (prihodi/rashodi/neto s % promjenama)
- Advisor mjesečne usporedbe: 4 nova tipa savjeta baziranih na snapshotovima
- StatusSemaphore fix: uklonjeno zbunjujuće 698/2211, prikazuje stvarne prihode/rashode/neto
- `parseUserDate()` helper za parsiranje dd.MM.yyyy i dd-MM-yyyy formata
- `formatDate()` try-catch za sprječavanje crasheva na nevalidnim datumima
- Goals tab crash fix: emoji account ikone → `getAccountIonicon()`, date parsing fix

### Post-faze: Kompletne moderne ikone + Budget preferenca
- **Advisor ekran**: svi emojiji (savjeti, check-in, edukacija, pojmovnik) poštuju iconStyle
- **ReportsScreen**: 4 emoji lokacije zamijenjene s CategoryIcon
- **TransactionsScreen**: emoji uklonjen iz Alert naslova
- **SelectableChip**: dodana Ionicons podrška za moderni stil
- **GoalsStep (onboarding)**: header emoji → Ionicons u modernom modu
- `ADVISOR_EMOJI_IONICONS` — 30+ mapiranja emoji→Ionicons u categoryIcons.ts
- **Zadani prikaz budžeta**: nova postavka u Settings (Kuverte / 50/30/20)
- `defaultBudgetView` u `useSettingsStore`, persistirano u `app_settings`
- `BudgetScreen` koristi `defaultBudgetView` kao inicijalni mode

## APK Build proces
```bash
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"
export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"
export PATH="$JAVA_HOME/bin:$PATH"
npx expo prebuild --platform android --clean
# OBAVEZNO nakon prebuild: fix gradle.properties JVM args!
# org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon
cp android/app/build/outputs/apk/release/app-release.apk "$USERPROFILE/Desktop/MojNovcnik.apk"
```

## Važne napomene
- npm install treba `--legacy-peer-deps` flag
- expo prebuild --clean RESETIRA gradle.properties — uvijek ponovo podesiti JVM args
- Kategorije imaju dva stila ikona (classic=emoji, modern=Ionicons) — `CategoryIcon` komponenta
- Git remote: https://github.com/Bandrax/Stedishia (branch: master)
- Expo docs: https://docs.expo.dev/versions/v54.0.0/
- Testovi: 83 unit testa (calculations, autoCategory, CSV, subscriptions, formatters)
- Datumi: prikaz dd.MM.yyyy, interno YYYY-MM-DD
- Ponavljajuća plaćanja su podsjetnici, ne automatski rashodi — transakcija se kreira tek na "Plaćeno"

## Što još treba
- Kontinuirano testiranje na Android-u
- iOS testiranje odgođeno (nema jednostavnog načina za instalaciju bez Apple Developer računa)
