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
- **Scope**: Transakcije imaju scope: 'personal' | 'shared'
- **Sync**: JSON export/import putem dijeljenja (Google Drive, AirDrop)
- **AI savjeti**: Potpuno lokalno (pravila + heuristike)
- **Dizajn**: #0F4C3A primarna, #D4AF37 akcent, dark/light auto tema
- **Ikone**: Ionicons iz @expo/vector-icons (emoji samo kao content u kategorijama)
- **Budžet**: Bazira se na ukupnom stanju računa (ne monthlyIncome iz profila)

## Navigacija
- TabNavigator: Home, Transactions, Budget, Goals, More (sve Ionicons)
- MoreScreen -> Reports, Accounts, Advisor, Household, RecurringPayments, Settings

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

### Post-faze: Notifikacije
- expo-notifications sustav (src/services/notificationService.ts)
- Payment reminders: 24h prije due date, 9:00
- Weekly budget check: ponedjeljak 9:00
- Monthly summary: 1. u mjesecu 10:00
- Android kanali: 'payments' (HIGH), 'tips' (DEFAULT)

### Post-faze: Budget sustav refactor
- 50/30/20 postoci prema stručnjacima (Elizabeth Warren): stanovanje 27%, hrana 13%, itd. = 100%
- Budget baziran na ukupnom stanju računa (ne monthlyIncome iz profila)
- Gumb "Regeneriraj 50/30/20" za resetiranje na preporučene postotke
- BudgetSummaryHeader: prikazuje "Ukupno stanje" kao glavni broj
- StatusSemaphore interaktivan: tap otvara modal s detaljima i objašnjenjem

### Post-faze: Ponavljajuća plaćanja fix
- Dan u mjesecu picker (1-31) umjesto ručnog YYYY-MM-DD unosa
- Auto-izračun nextDueDate iz odabranog dana
- Fix DB schema mismatch: recurring_transactions tablica nema updated_at
- Migracija: account_id nullable, uklonjen FK constraint
- start_date dodan u insert
- Podrška za europski decimalni zarez (150,50)
- Error handling s alertom za prikaz grešaka

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

## Što još treba
- Faza 10 dovršiti: Google Drive sync integracija
- Testiranje na iOS-u (djevojkin iPhone)
- Više unit testova za nove feature-e (notifikacije, recurring)
- PDF/CSV export izvještaja
- Detekcija pretplata + godišnji trošak
