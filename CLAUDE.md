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
- **Ikone**: Ionicons iz @expo/vector-icons (emoji samo kao content u kategorijama)

## Navigacija
- TabNavigator: Home, Transactions, Budget, Goals, More (sve Ionicons, i18n labele)
- MoreScreen -> Reports, Accounts, Advisor, Household, RecurringPayments, Settings

## Kategorije

### Rashodi (13 kategorija)
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
| education | Edukacija | Education | 📚 | Želje | 5% |
| gifts | Pokloni | Gifts | 🎁 | Želje | 5% |
| debt | Otplata kredita | Debt Payment | 🏦 | Štednja | 10% |
| other_expense | Ostalo | Other | 📌 | Štednja | 10% |

**Ukupno: 100%** (Potrebe 50%, Želje 30%, Štednja 20%)

### Prihodi (8 kategorija)
salary, freelance, bonus, investment_income, rental_income, business_income, association_income, other_income

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
- Fallback: `suggestFromHistory()` — traži sličan opis u prošlim transakcijama

## Budget sustav

### Dva moda
1. **Envelope (Kuverte)** — ručna raspodjela po kategoriji
2. **50/30/20** — automatska raspodjela prema preporučenim postocima

### Budget baza (fallback logika)
```
effectiveBase = income > 0 ? income : totalAllocated > 0 ? totalAllocated : balance + expenses
```
- Nikad ne koristi monthlyIncome iz profila
- Dinamički računa iz stvarnog stanja računa

### BudgetSummaryHeader (2x2 grid)
- Mjesečni prihod (zeleno), Mjesečni rashodi (crveno)
- Neto rezultat (zeleno/crveno), Ukupno stanje (zlatno)
- Progress bar: potrošeno/raspoređeno vs prihod

### 50/30/20 grupe
- **Potrebe**: housing, food, transport, utilities, health, appliances
- **Želje**: entertainment, clothing, personal, gifts, education
- **Štednja/Dugovi**: debt, other_expense
- Targeti koriste `groupAllocated()` iz DB alokacija, ne dinamički postotak

### Envelope funkcionalnosti
- +10/-10 i +50/-50 gumbi za alokaciju
- **Auto-balance**: postavlja allocated = ceil(spent) za overbudget kategorije
- **Preseti**: spremi/učitaj imenovane konfiguracije alokacija
  - DB tablica: `budget_presets` (id, user_id, name, allocations JSON, created_at)
  - `saveBudgetPreset()`, `getBudgetPresets()`, `loadBudgetPreset()`, `deleteBudgetPreset()`

## i18n sustav

### Potpuna internacionalizacija
- **Svaki** string u aplikaciji koristi `t()` (React) ili `i18n.t()` (servisi)
- 450+ prijevodnih ključeva u hr.json i en.json
- Pokriva: navigaciju, sve ekrane, onboarding, PIN, budžet, ciljeve, izvještaje, savjetnika, notifikacije, sync
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

### Currency picker u Settings
- Tappable row → modal s listom valuta (kod, simbol, ime)
- Checkmark za odabranu valutu

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

## SQLite tablice
- users, transactions, accounts, budgets, goals, recurring_transactions
- households (s invite_code), household_members
- budget_presets (id, user_id, name, allocations TEXT, created_at)
- app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)

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

### Post-faze: Ponavljajuća plaćanja fix
- Dan u mjesecu picker (1-31) umjesto ručnog YYYY-MM-DD unosa
- Auto-izračun nextDueDate iz odabranog dana
- Fix DB schema mismatch: recurring_transactions tablica nema updated_at
- Migracija: account_id nullable, uklonjen FK constraint
- Podrška za europski decimalni zarez (150,50)
- Error handling s alertom za prikaz grešaka

### Post-faze: Kompletna i18n + valuta
- Zamjena SVIH hardkodiranih hrvatskih stringova s t() pozivima (~20 ekrana, svi servisi)
- Language switcher u Settings (Hrvatski / English)
- 450+ prijevodnih ključeva, savršeno usklađena hr.json i en.json
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
- Kategorije koriste emoji kao CONTENT (🏠 za stanovanje) — to je OK
- Git remote: https://github.com/Bandrax/Stedishia (branch: master)
- Expo docs: https://docs.expo.dev/versions/v54.0.0/
- Testovi: 56 unit testova (calculations, autoCategory, CSV, subscriptions, formatters)

## Što još treba
- Testiranje na iOS-u (djevojkin iPhone)
- APK build i testiranje na Android-u
