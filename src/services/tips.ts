// Lokalni sustav dnevnih financijskih savjeta
// Savjeti su napisani laičkim jezikom, prijateljskim tonom

const generalTips = [
  'Prije nego kupite nešto, pitajte se: "Da li bih ovo kupio/la za gotovinu?" Ako ne, vjerovatno ne trebate.',
  'Pokušajte "pravilo 24 sata" — kad poželite nešto kupiti, pričekajte dan. Često ćete shvatiti da vam ne treba.',
  'Pregled pretplata jednom mjesečno može uštedjeti više nego što mislite. Koje servise stvarno koristite?',
  'Čak i 50€ mjesečno štednje je 600€ godišnje. Mali koraci stvaraju velike rezultate!',
  'Kuhanje kod kuće umjesto dostave može uštedjeti 200-400€ mjesečno za dvočlano kućanstvo.',
  'Automatizirana štednja radi čuda — postavite automatski prijenos na štedni račun čim sjedne plaća.',
  'Usporedite cijene u dva-tri dućana za velike kupovine. Razlike znaju biti i 20-30%.',
  'Sigurnosni fond od 3 mjeseca troškova je vaš financijski mir. Vrijedi svaki cent.',
  'Napravite listu prije odlaska u dućan. Kupnja bez liste povećava potrošnju za ~20%.',
  'Pretplate na godišnjoj bazi su obično 15-20% jeftinije od mjesečnih.',
  'Kad dobijete povišicu, pokušajte "uštedjeti razliku" umjesto da odmah povećate potrošnju.',
  'Voda iz slavine umjesto kupovne — ušteda do 300€ godišnje za kućanstvo.',
  'Postavite ciljeve kojima se veselite. Štednja za odmor je motivirajuća, štednja "zato što moram" nije.',
  'Pratite troškove barem 3 mjeseca da vidite realne obrasce potrošnje.',
  'Podjelite troškove s partnerom transparentno — zajedničke financije su zdravije financije.',
  'LED žarulje troše 75% manje struje. Mala ulaganja, velika ušteda na duže staze.',
  'Obrok planirajte nedjeljom. Manje bacate hrane i manje naručujete dostavu.',
  'Prije velikog troška pitajte: "Koliko sati moram raditi da ovo zaradim?"',
  'Cashback kartice mogu vratiti 1-3% potrošnje. Na godišnjoj razini to je pristojan iznos.',
  'Ne uspoređujte se s drugima na društvenim mrežama. Većina ne prikazuje pravu financijsku sliku.',
  'Popust od 50% na nešto što ne trebate i dalje košta — nije ušteda, nego trošak.',
  'Energetski razred uređaja stvarno utječe na račune. A+++ može uštedjeti 100€+ godišnje.',
  'Jednom mjesečno pregledajte sve automatske naplate na kartici. Iznenadili biste se.',
  'Zajednički budžet ne znači da nemate osobne troškove. Dogovorite koliko svatko ima "za sebe".',
  'Investicija u edukaciju i zdravlje se uvijek isplati dugoročno.',
];

// Vrača savjet dana na temelju datuma (isti savjet cijeli dan)
export const getDailyTip = (): string => {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
    (1000 * 60 * 60 * 24)
  );
  const index = dayOfYear % generalTips.length;
  return generalTips[index];
};

// Personalizirani savjeti na temelju podataka
export interface PersonalizedTipInput {
  monthlyIncome: number;
  totalExpenses: number;
  topCategory?: { name: string; amount: number; percentOfTotal: number };
  emergencyFundMonths?: number;
  subscriptionTotal?: number;
  categoryOverBudget?: string[];
  savingsRate?: number;
}

export const getPersonalizedTips = (input: PersonalizedTipInput): string[] => {
  const tips: string[] = [];

  // Stopa štednje
  if (input.monthlyIncome > 0) {
    const savingsRate = ((input.monthlyIncome - input.totalExpenses) / input.monthlyIncome) * 100;
    if (savingsRate < 0) {
      tips.push(
        `Ovaj mjesec trošite više nego što zarađujete. Pogledajmo zajedno gdje možemo rezati.`
      );
    } else if (savingsRate < 10) {
      tips.push(
        `Vaša stopa štednje je ${savingsRate.toFixed(0)}%. Cilj je barem 20% — pokušajmo pronaći prostor za poboljšanje.`
      );
    } else if (savingsRate >= 20) {
      tips.push(
        `Bravo! Štedite ${savingsRate.toFixed(0)}% prihoda. To je odličan tempo!`
      );
    }
  }

  // Top kategorija
  if (input.topCategory && input.topCategory.percentOfTotal > 40) {
    tips.push(
      `${input.topCategory.name} čini ${input.topCategory.percentOfTotal.toFixed(0)}% vaših troškova. Je li to u skladu s vašim prioritetima?`
    );
  }

  // Sigurnosni fond
  if (input.emergencyFundMonths !== undefined && input.emergencyFundMonths < 3) {
    tips.push(
      `Vaš sigurnosni fond pokriva ${input.emergencyFundMonths.toFixed(1)} mjeseci troškova. Preporučeno je 3-6 mjeseci.`
    );
  }

  // Pretplate
  if (input.subscriptionTotal && input.subscriptionTotal > 50) {
    tips.push(
      `Pretplate vam idu ${input.subscriptionTotal.toFixed(0)}€ mjesečno (${(input.subscriptionTotal * 12).toFixed(0)}€ godišnje). Vrijedi pregledati koje stvarno koristite.`
    );
  }

  // Prekoračenje budžeta
  if (input.categoryOverBudget && input.categoryOverBudget.length > 0) {
    const categories = input.categoryOverBudget.join(', ');
    tips.push(
      `Prekoračili ste budžet za: ${categories}. Možda je vrijeme za realnije limite?`
    );
  }

  return tips;
};
