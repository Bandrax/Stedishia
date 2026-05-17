import { dbQuery } from './database';
import { getCurrentMonth } from '../utils';
import { getMonthlyStats, getTopExpenses, getBudgetProgress } from './dashboardService';
import { getEmergencyFundCoverage, getNetWorth } from './goalService';
import { detectSubscriptions } from './debtService';
import { getDebts } from './debtService';
import type { AdviceCategory, AdvicePriority } from '../types';

export interface Advice {
  id: string;
  title: string;
  message: string;
  category: AdviceCategory;
  priority: AdvicePriority;
  emoji: string;
  actionLabel?: string;
}

// Generiraj personalizirane savjete na temelju financijskih podataka
export const generateAdvice = async (userId: string): Promise<Advice[]> => {
  const advice: Advice[] = [];
  const month = getCurrentMonth();

  try {
    // Dohvati podatke
    const stats = await getMonthlyStats(userId, month);
    const topExpenses = await getTopExpenses(userId, month, 5);
    const budgetProgress = await getBudgetProgress(userId, month);
    const debts = await getDebts(userId);
    const subscriptions = await detectSubscriptions(userId);
    const netWorthData = await getNetWorth(userId);

    let emergencyMonths = 0;
    if (stats.expenses > 0) {
      emergencyMonths = await getEmergencyFundCoverage(userId, stats.expenses);
    }

    const savingsRate = stats.income > 0 ? ((stats.income - stats.expenses) / stats.income) * 100 : 0;

    // === ANALIZA POTROŠNJE ===

    // Trošite više nego zarađujete
    if (stats.income > 0 && stats.expenses > stats.income) {
      const overBy = stats.expenses - stats.income;
      advice.push({
        id: 'overspending',
        title: 'Potrošnja premašuje prihode',
        message: `Ovaj mjesec ste potrošili ${overBy.toFixed(0)}€ više nego što ste zaradili. ` +
          `To nije održivo dugoročno. Pogledajte koje kategorije troškova možete smanjiti.`,
        category: 'spending',
        priority: 'high',
        emoji: '🚨',
        actionLabel: 'Pogledaj troškove',
      });
    }

    // Stopa štednje
    if (savingsRate > 0 && savingsRate < 10) {
      advice.push({
        id: 'low_savings',
        title: 'Niska stopa štednje',
        message: `Vaša stopa štednje je ${savingsRate.toFixed(0)}%. Financijski stručnjaci preporučuju ` +
          `barem 20%. Pokušajte pronaći jednu kategoriju gdje možete rezati 10-15%.`,
        category: 'saving',
        priority: 'medium',
        emoji: '💡',
      });
    } else if (savingsRate >= 20) {
      advice.push({
        id: 'great_savings',
        title: 'Odlična stopa štednje!',
        message: `Štedite ${savingsRate.toFixed(0)}% prihoda — to je iznad preporučenog minimuma od 20%. ` +
          `Nastavite tako! Razmislite o ulaganju viška u dugoročne ciljeve.`,
        category: 'saving',
        priority: 'low',
        emoji: '🌟',
      });
    }

    // === ANALIZA BUDŽETA ===

    const overBudgetCategories = budgetProgress.filter((b) => b.spent > b.allocated && b.allocated > 0);
    if (overBudgetCategories.length > 0) {
      advice.push({
        id: 'over_budget',
        title: `${overBudgetCategories.length} kategorija preko budžeta`,
        message: `Prekoračili ste budžet u ${overBudgetCategories.length} kategorija. ` +
          `To se događa — važno je analizirati zašto i prilagoditi budžet sljedeći mjesec. ` +
          `Nerealan budžet je gori od nikakvog budžeta.`,
        category: 'budget',
        priority: 'medium',
        emoji: '📊',
        actionLabel: 'Pogledaj budžet',
      });
    }

    const nearBudgetCategories = budgetProgress.filter(
      (b) => b.allocated > 0 && b.spent / b.allocated >= 0.8 && b.spent <= b.allocated
    );
    if (nearBudgetCategories.length > 0) {
      advice.push({
        id: 'near_budget',
        title: 'Bliži se limit u nekim kategorijama',
        message: `Imate ${nearBudgetCategories.length} kategorija koje su na 80%+ budžeta. ` +
          `Pazite na potrošnju do kraja mjeseca da ostanete u planu.`,
        category: 'budget',
        priority: 'low',
        emoji: '⚠️',
      });
    }

    // === ANALIZA DUGOVA ===

    const activeDebts = debts.filter((d) => d.remainingAmount > 0);
    if (activeDebts.length > 0) {
      const totalDebt = activeDebts.reduce((s, d) => s + d.remainingAmount, 0);
      const highInterest = activeDebts.filter((d) => d.interestRate > 10);

      if (highInterest.length > 0) {
        advice.push({
          id: 'high_interest_debt',
          title: 'Dugovi s visokom kamatom',
          message: `Imate ${highInterest.length} dug(ova) s kamatnom stopom iznad 10%. ` +
            `Prioritizirajte otplatu ovih dugova jer kamata "jede" vašu uštedu. ` +
            `Razmotrite "avalanche" metodu otplate.`,
          category: 'general',
          priority: 'high',
          emoji: '🔥',
          actionLabel: 'Pogledaj dugove',
        });
      }

      if (stats.income > 0) {
        const debtToIncomeRatio = (activeDebts.reduce((s, d) => s + d.minimumPayment, 0) / stats.income) * 100;
        if (debtToIncomeRatio > 40) {
          advice.push({
            id: 'debt_burden',
            title: 'Visoki mjesečni rata',
            message: `Rate kredita čine ${debtToIncomeRatio.toFixed(0)}% vaših prihoda. ` +
              `Financijski stručnjaci preporučuju ispod 36%. Razmotrite konsolidaciju ili refinanciranje.`,
            category: 'general',
            priority: 'high',
            emoji: '⚡',
          });
        }
      }
    }

    // === ANALIZA PRETPLATA ===

    if (subscriptions.length > 0) {
      const totalMonthlySubs = subscriptions.reduce((s, sub) => s + sub.yearlyTotal / 12, 0);
      const totalYearlySubs = subscriptions.reduce((s, sub) => s + sub.yearlyTotal, 0);

      if (totalMonthlySubs > 100) {
        advice.push({
          id: 'high_subscriptions',
          title: 'Visoki troškovi pretplata',
          message: `Pretplate vas koštaju ${totalMonthlySubs.toFixed(0)}€/mj (${totalYearlySubs.toFixed(0)}€/god). ` +
            `Pregledajte svaku pretplatu i zapitajte se: "Koliko često ovo stvarno koristim?"`,
          category: 'subscription',
          priority: 'medium',
          emoji: '🔄',
          actionLabel: 'Pogledaj pretplate',
        });
      } else if (subscriptions.length > 5) {
        advice.push({
          id: 'many_subscriptions',
          title: `${subscriptions.length} aktivnih pretplata`,
          message: `Imate ${subscriptions.length} pretplata. Možda neke možete podijeliti s ` +
            `partnerom/icom (obiteljski planovi) ili zamijeniti besplatnim alternativama?`,
          category: 'subscription',
          priority: 'low',
          emoji: '📋',
        });
      }
    }

    // === SIGURNOSNI FOND ===

    if (emergencyMonths < 1) {
      advice.push({
        id: 'no_emergency_fund',
        title: 'Hitno: sigurnosni fond',
        message: `Nemate dovoljno ušteđevine za pokriti niti jedan mjesec troškova. ` +
          `Ovo bi trebao biti prioritet br. 1. Započnite s malim — čak i 50€ mjesečno je početak.`,
        category: 'saving',
        priority: 'high',
        emoji: '🛡️',
        actionLabel: 'Postavi cilj',
      });
    } else if (emergencyMonths < 3) {
      advice.push({
        id: 'low_emergency_fund',
        title: 'Sigurnosni fond u izgradnji',
        message: `Vaš sigurnosni fond pokriva ${emergencyMonths.toFixed(1)} mjeseci troškova. ` +
          `Dobro je da ste počeli, ali cilj je 3-6 mjeseci za pravi financijski mir.`,
        category: 'saving',
        priority: 'medium',
        emoji: '🏗️',
      });
    } else if (emergencyMonths >= 6) {
      advice.push({
        id: 'strong_emergency_fund',
        title: 'Sjajan sigurnosni fond!',
        message: `Imate ${emergencyMonths.toFixed(1)} mjeseci troškova u sigurnosnom fondu. ` +
          `To je odlična pozicija! Možete se sad fokusirati na dugoročne ciljeve.`,
        category: 'saving',
        priority: 'low',
        emoji: '🛡️✨',
      });
    }

    // === NETO VRIJEDNOST ===

    if (netWorthData.netWorth < 0) {
      advice.push({
        id: 'negative_net_worth',
        title: 'Negativna neto vrijednost',
        message: `Vaši dugovi (${netWorthData.liabilities.toFixed(0)}€) premašuju imovinu (${netWorthData.assets.toFixed(0)}€). ` +
          `To je uobičajeno dok imate kredit — fokusirajte se na smanjenje dugova i izgradnju imovine.`,
        category: 'general',
        priority: 'medium',
        emoji: '📉',
      });
    }

    // === POZITIVNI SAVJETI ===

    if (advice.length === 0 || advice.every((a) => a.priority === 'low')) {
      advice.push({
        id: 'all_good',
        title: 'Financije su na dobrom putu!',
        message: `Na temelju vaših podataka, stvari izgledaju dobro. Nastavite pratiti troškove ` +
          `i držati se budžeta. Konzistentnost je ključ financijskog zdravlja.`,
        category: 'general',
        priority: 'low',
        emoji: '🌈',
      });
    }
  } catch (error) {
    console.error('Advice generation error:', error);
    advice.push({
      id: 'error',
      title: 'Savjeti dolaze uskoro',
      message: 'Unesite više transakcija kako bismo vam mogli dati personalizirane savjete.',
      category: 'general',
      priority: 'low',
      emoji: '📊',
    });
  }

  // Sortiraj po prioritetu
  const priorityOrder: Record<AdvicePriority, number> = { high: 0, medium: 1, low: 2 };
  advice.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return advice;
};

// Tjedni check-in pitanja
export const getWeeklyCheckIn = (): Array<{
  question: string;
  emoji: string;
  type: 'yes_no' | 'scale' | 'reflection';
}> => {
  const weekOfYear = Math.floor(
    (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
    (1000 * 60 * 60 * 24 * 7)
  );

  const allCheckIns = [
    [
      { question: 'Jeste li ovaj tjedan ostali u okviru budžeta?', emoji: '💰', type: 'yes_no' as const },
      { question: 'Na ljestvici 1-5, koliko ste zadovoljni s potrošnjom?', emoji: '⭐', type: 'scale' as const },
      { question: 'Koji je bio vaš najmudriji financijski potez ovaj tjedan?', emoji: '🧠', type: 'reflection' as const },
    ],
    [
      { question: 'Jeste li izbjegli nepotreban impulsivan trošak?', emoji: '🛍️', type: 'yes_no' as const },
      { question: 'Koliko ste svjesni svojih dnevnih troškova (1-5)?', emoji: '👁️', type: 'scale' as const },
      { question: 'Što biste promijenili u potrošnji prošlog tjedna?', emoji: '🔄', type: 'reflection' as const },
    ],
    [
      { question: 'Jeste li uplatili nešto u štednju?', emoji: '🐷', type: 'yes_no' as const },
      { question: 'Koliko se osjećate financijski sigurno (1-5)?', emoji: '🛡️', type: 'scale' as const },
      { question: 'Na što ste ponosni u financijskom smislu?', emoji: '🏆', type: 'reflection' as const },
    ],
    [
      { question: 'Jeste li pregledali sve troškove za ovaj tjedan?', emoji: '📋', type: 'yes_no' as const },
      { question: 'Koliko ste kontrole imali nad potrošnjom (1-5)?', emoji: '🎯', type: 'scale' as const },
      { question: 'Koji cilj želite ostvariti sljedeći tjedan?', emoji: '🎯', type: 'reflection' as const },
    ],
  ];

  return allCheckIns[weekOfYear % allCheckIns.length];
};

// Edukacijski članci
export const getEducationArticles = (): Array<{
  id: string;
  title: string;
  emoji: string;
  summary: string;
  content: string;
  readTimeMin: number;
}> => [
  {
    id: 'budgeting_101',
    title: 'Što je budžet i zašto ga trebate?',
    emoji: '📒',
    summary: 'Budžet nije ograničenje — to je plan koji vam daje slobodu.',
    readTimeMin: 3,
    content: `Budžet zvuči zastrašujuće, ali zapravo je jednostavno: to je plan kamo ide vaš novac.

Zamislite da je vaš prihod torta. Budžet je način na koji režete tu tortu — koliko za stan, hranu, zabavu, štednju.

BEZ budžeta novac "nestaje" i na kraju mjeseca se pitate kamo je otišao. S budžetom VI odlučujete.

Popularna metoda je 50/30/20:
• 50% za potrebe (stan, režije, hrana)
• 30% za želje (izlasci, hobiji, shopping)
• 20% za štednju i otplatu dugova

Ne morate biti savršeni. Cilj je svjesnost — znati kamo novac ide. Već to mijenja ponašanje.`,
  },
  {
    id: 'emergency_fund',
    title: 'Sigurnosni fond: Vaš financijski jastuk',
    emoji: '🛡️',
    summary: 'Zašto trebate 3-6 mjeseci troškova sa strane.',
    readTimeMin: 3,
    content: `Zamislite da vam se pokvari auto, da izgubite posao, ili da trebate hitnu medicinsku intervenciju. Bez sigurnosnog fonda, to postaje kriza. S njim — to je samo neugodnost.

Koliko trebate? 3-6 mjeseci osnovnih troškova (stan, hrana, režije, rate).

Ako su vam mjesečni troškovi 1.500€, trebate 4.500-9.000€ sa strane.

Kako do toga?
1. Započnite s malim — čak 50€ mjesečno je 600€ godišnje
2. Otvorite zasebni štedni račun (da ga ne "vidite")
3. Automatizirajte transfer čim sjedne plaća
4. Svaki bonus, povrat poreza ili poklon — dio ide u fond

Ne odustajte ako je cilj daleko. Svaki euro vas čini sigurnijima.`,
  },
  {
    id: 'compound_interest',
    title: 'Složena kamata: 8. svjetsko čudo',
    emoji: '📈',
    summary: 'Kako vaš novac zarađuje novac, koji zarađuje novac...',
    readTimeMin: 4,
    content: `Einstein je navodno rekao da je složena kamata "najmoćnija sila u svemiru". Što to znači?

Jednostavna kamata: 1.000€ × 5% = 50€ godišnje. Svake godine 50€.

Složena kamata: 1.000€ × 5% = 50€ prvu godinu. Ali drugu godinu, 5% se računa na 1.050€, pa dobijete 52,50€. I tako dalje — kamata na kamatu.

Za 30 godina:
• 1.000€ s jednostavnom kamatom → 2.500€
• 1.000€ sa složenom kamatom → 4.322€

Ali pazite — ovo radi i PROTIV vas kod dugova! Kamata na kredit se isto "slaže".

Pravilo 72: podijelite 72 s kamatnom stopom i dobijete broj godina da se novac udvostruči.
72 ÷ 7% = ~10 godina za udvostručenje.

Poruka: počnite rano, budite strpljivi, i puštajte složenu kamatu da radi za vas.`,
  },
  {
    id: 'debt_strategies',
    title: 'Kako se riješiti dugova: Snowball vs Avalanche',
    emoji: '⛷️',
    summary: 'Dvije dokazane strategije za otplatu dugova.',
    readTimeMin: 4,
    content: `Ako imate više dugova, dvije strategije su najpopularnije:

⛄ SNOWBALL (grudva snijega):
Otplaćujete NAJMANJI dug prvo, dok na ostale plaćate minimum.
+ Brze pobjede motiviraju!
- Plaćate više kamata ukupno.

🏔️ AVALANCHE (lavina):
Otplaćujete dug s NAJVEĆOM kamatom prvo.
+ Matematički optimalno — plaćate manje kamata.
- Može biti demotivirajuće jer se veći dugovi polako smanjuju.

Što je bolje? Ovisi o vama:
• Ako vam treba motivacija → Snowball
• Ako želite minimizirati troškove → Avalanche
• Oboje radi! Najvažnije je da PLATITE nešto iznad minimuma.

Savjet: uzmite bilo koji "višak" novca (bonus, porez, smanjeni trošak) i stavite ga na dug. Čak i 50€ ekstra mjesečno može skratiti otplatu za godine.`,
  },
  {
    id: 'lifestyle_inflation',
    title: 'Životna inflacija: Skriveni ubojica štednje',
    emoji: '🎈',
    summary: 'Zašto više zarađujete ali nikad nemate dovoljno?',
    readTimeMin: 3,
    content: `Dobili ste povišicu od 300€? Super! Ali odjednom imate bolji mobitel, skuplji restoran, novi hobi... i opet nema viška.

To je "lifestyle inflation" — kako zarađujete više, trošite više. Rezultat: nikad ne štedite više.

Kako se boriti:
1. "Platite se prvi" — kad dobijete povišicu, automatski povećajte štednju za pola iznosa
2. Čekajte 30 dana prije velikih kupovina
3. Pratite troškove — svjesnost je pola bitke
4. Pitajte se: "Je li ovo nešto što stvarno želim, ili mi se čini da sad mogu?"

Nije poanta živjeti škrto. Poanta je trošiti na ono što vam STVARNO donosi sreću, a ne na ono što "ide uz viši prihod".

Zapamtite: bogatstvo nije koliko zarađujete — nego koliko ZADRŽAVATE.`,
  },
];

// Financijski pojmovnik
export const getFinancialGlossary = (): Array<{
  term: string;
  definition: string;
  emoji: string;
}> => [
  { term: 'Budžet', definition: 'Plan koji određuje koliko novca ide na što. Kao dijeta, ali za novce.', emoji: '📒' },
  { term: 'Neto vrijednost', definition: 'Sve što imate (imovina) minus sve što dugujete. Vaš financijski "rezultat".', emoji: '📊' },
  { term: 'Stopa štednje', definition: 'Postotak prihoda koji ušteđujete. Cilj: barem 20%.', emoji: '🐷' },
  { term: 'Sigurnosni fond', definition: 'Novac sa strane za "crne dane". Preporučeno 3-6 mjeseci troškova.', emoji: '🛡️' },
  { term: 'Složena kamata', definition: 'Kamata na kamatu — vaš novac zarađuje novac, koji zarađuje novac...', emoji: '📈' },
  { term: 'Likvidnost', definition: 'Koliko brzo možete pretvoriti nešto u gotovinu. Štedni račun = visoka likvidnost, nekretnina = niska.', emoji: '💧' },
  { term: 'Inflacija', definition: 'Rast cijena s vremenom. 100€ danas kupi manje nego 100€ prije 10 godina.', emoji: '🎈' },
  { term: 'Amortizacija', definition: 'Raspored otplate kredita — koliko ide na kamatu, a koliko na glavnicu.', emoji: '📋' },
  { term: 'Diverzifikacija', definition: '"Ne stavljajte sva jaja u jednu košaru." Raspodijelite ulaganja na više mjesta.', emoji: '🥚' },
  { term: 'Pasivni prihod', definition: 'Novac koji zarađujete bez aktivnog rada — najam, dividende, kamate.', emoji: '😴' },
  { term: 'Cash flow', definition: 'Razlika između novca koji ulazi i izlazi. Pozitivan = super, negativan = problem.', emoji: '💸' },
  { term: 'ROI', definition: 'Return on Investment — koliko ste zaradili u odnosu na uloženo. "Je li se isplatilo?"', emoji: '🎯' },
];
