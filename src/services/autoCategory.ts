// Auto-kategorizacija transakcija na temelju opisa
// Lokalna pravila - bez ML, brzo i offline

interface CategoryRule {
  keywords: string[];
  categoryId: string;
  subcategoryId?: string;
}

const rules: CategoryRule[] = [
  // Hrana i piće
  { keywords: ['konzum', 'spar', 'lidl', 'kaufland', 'plodine', 'tommy', 'studenac', 'interspar', 'dm', 'müller', 'billa'], categoryId: 'food', subcategoryId: 'groceries' },
  { keywords: ['mcdonalds', 'mcdonald', 'burger king', 'kfc', 'subway', 'pizza', 'restoran', 'restaurant', 'bistro', 'grill', 'pizzeria', 'sushi'], categoryId: 'food', subcategoryId: 'restaurants' },
  { keywords: ['kava', 'coffee', 'kavana', 'starbucks', 'cafe', 'caffe'], categoryId: 'food', subcategoryId: 'coffee' },
  { keywords: ['wolt', 'glovo', 'bolt food', 'dostava', 'delivery'], categoryId: 'food', subcategoryId: 'delivery' },

  // Prijevoz
  { keywords: ['gorivo', 'benzin', 'diesel', 'ina', 'petrol', 'mol', 'tifon', 'lukoil'], categoryId: 'transport', subcategoryId: 'fuel' },
  { keywords: ['zet', 'tramvaj', 'autobus', 'bus', 'vlak', 'hž', 'flixbus'], categoryId: 'transport', subcategoryId: 'public_transport' },
  { keywords: ['parking', 'garaža'], categoryId: 'transport', subcategoryId: 'parking' },
  { keywords: ['autoservis', 'mehaničar', 'gume', 'servis auta', 'registracija'], categoryId: 'transport', subcategoryId: 'car_maintenance' },
  { keywords: ['uber', 'bolt', 'taxi'], categoryId: 'transport' },

  // Režije
  { keywords: ['hep', 'struja', 'elektra', 'electricity'], categoryId: 'utilities', subcategoryId: 'electricity' },
  { keywords: ['voda', 'vodovod', 'water'], categoryId: 'utilities', subcategoryId: 'water' },
  { keywords: ['plin', 'gradska plinara', 'gas'], categoryId: 'utilities', subcategoryId: 'gas' },
  { keywords: ['internet', 'a1', 'hrvatski telekom', 'ht', 'telemach', 'iskon', 'optima', 'tele2'], categoryId: 'utilities', subcategoryId: 'internet' },
  { keywords: ['mobitel', 'mobile', 'simpa', 'bonbon'], categoryId: 'utilities', subcategoryId: 'phone' },

  // Stanovanje
  { keywords: ['najam', 'renta', 'rent', 'stanarina'], categoryId: 'housing', subcategoryId: 'rent' },
  { keywords: ['kredit za stan', 'hipoteka', 'mortgage', 'stambeni kredit'], categoryId: 'housing', subcategoryId: 'mortgage' },
  { keywords: ['ikea', 'jysk', 'namještaj', 'lesnina', 'harvey norman'], categoryId: 'housing', subcategoryId: 'furniture' },

  // Zdravlje
  { keywords: ['ljekarna', 'farmacia', 'pharmacy', 'lijek', 'apoteka'], categoryId: 'health', subcategoryId: 'pharmacy' },
  { keywords: ['doktor', 'liječnik', 'ordinacija', 'bolnica', 'klinika', 'doctor'], categoryId: 'health', subcategoryId: 'doctor' },
  { keywords: ['teretana', 'gym', 'fitness', 'crossfit', 'yoga', 'pilates'], categoryId: 'health', subcategoryId: 'gym' },

  // Zabava
  { keywords: ['kino', 'cinema', 'cinestar', 'cineplexx'], categoryId: 'entertainment', subcategoryId: 'movies' },
  { keywords: ['netflix', 'hbo', 'disney', 'spotify', 'youtube premium', 'apple music', 'deezer', 'amazon prime'], categoryId: 'entertainment', subcategoryId: 'subscriptions' },
  { keywords: ['bar', 'pub', 'club', 'klub', 'noćni', 'izlazak', 'piće'], categoryId: 'entertainment', subcategoryId: 'going_out' },

  // Odjeća
  { keywords: ['zara', 'h&m', 'hm', 'pull&bear', 'bershka', 'new yorker', 'c&a', 'about you', 'asos', 'reserved'], categoryId: 'clothing' },

  // Edukacija
  { keywords: ['knjiga', 'udemy', 'coursera', 'škola', 'fakultet', 'tečaj', 'seminar'], categoryId: 'education' },

  // Pokloni
  { keywords: ['poklon', 'gift', 'dar', 'rođendan'], categoryId: 'gifts' },

  // Prihodi
  { keywords: ['plaća', 'salary', 'plata'], categoryId: 'salary' },
  { keywords: ['honorar', 'freelance', 'ugovor'], categoryId: 'freelance' },
  { keywords: ['bonus', 'nagrada'], categoryId: 'bonus' },
];

export interface AutoCategoryResult {
  categoryId: string;
  subcategoryId?: string;
  confidence: number; // 0-1
}

export const autoDetectCategory = (description: string): AutoCategoryResult | null => {
  const lower = description.toLowerCase().trim();

  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return {
          categoryId: rule.categoryId,
          subcategoryId: rule.subcategoryId,
          confidence: 0.8,
        };
      }
    }
  }

  return null;
};

// Pronađi najčešću kategoriju za sličan opis iz povijesti
export const suggestFromHistory = async (
  userId: string,
  description: string
): Promise<AutoCategoryResult | null> => {
  // Uzmi prvu riječ kao ključ
  const firstWord = description.trim().split(/\s+/)[0]?.toLowerCase();
  if (!firstWord || firstWord.length < 3) return null;

  const { dbQuery } = await import('./database');
  const results = await dbQuery<{ category_id: string; subcategory_id: string | null; cnt: number }>(
    `SELECT category_id, subcategory_id, COUNT(*) as cnt
     FROM transactions
     WHERE user_id = ? AND LOWER(description) LIKE ?
     GROUP BY category_id, subcategory_id
     ORDER BY cnt DESC
     LIMIT 1`,
    [userId, `%${firstWord}%`]
  );

  if (results.length > 0) {
    return {
      categoryId: results[0].category_id,
      subcategoryId: results[0].subcategory_id || undefined,
      confidence: 0.6,
    };
  }

  return null;
};
