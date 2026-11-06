import type { StatusCopy } from "@/shared/lib/sites-tools";
import type { Facts, Text } from "./types";

const status = (
  code: string,
  title: string,
  eyebrow: string,
  headline: readonly [string, string],
  body: string,
  primary: StatusCopy<Facts>["primary"],
): StatusCopy<Facts> => ({ code, title, eyebrow, headline, body: () => body, primary, secondary: "home" });

// The Figma frame's words (Desktop 1440 9:107) in French, with French
// typography: `’`, « », and a no-break space ( ) before ? ! : ; and %,
// and inside the guillemets. The figures, reviews and prices are the file's
// sample content (OWNER_TODO "design sample content").
export const FR = {
  pages: {
    home: {
      title: () => "Vifnet — ménage à domicile",
      description: () => "Grand ménage, textiles et extérieurs, chez vous. Décrivez le besoin en une minute : nous vous rappelons.",
    },
    prices: {
      title: () => "Tarifs du ménage à domicile",
      description: () => "Des prix forfaitaires pour chaque prestation, annoncés avant notre venue. Vous payez après le ménage, une fois satisfait.",
    },
    guarantee: {
      title: () => "Notre garantie satisfaction",
      description: () => "Une zone ne vous convient pas ? Prévenez-nous dans les 24 heures : nous revenons la nettoyer sans frais.",
    },
    about: {
      title: () => "À propos de l’équipe",
      description: () => "Qui nettoie chez vous, comment l’équipe est vérifiée, et où nous allons.",
    },
  },
  quoteForm: {
    title: "Votre devis gratuit",
    lede: "Nous vous rappelons en moins de 15 minutes.",
    submit: "Recevoir mon devis gratuit →",
    privacy: "Votre numéro ne sert qu’à cette demande.",
    reassurance: () => "Nous vous rappelons au numéro indiqué.",
    honeypotLabel: "Site web",
  },
  notFound: status(
    "404",
    "Page introuvable",
    "Erreur 404",
    ["Cette page ", "n’existe pas."],
    "L’adresse ne mène à aucune page du site. Le devis, lui, est toujours à un clic.",
    "home",
  ),
  serverError: status("500", "Erreur", "Erreur 500", ["Un problème ", "de notre côté."], "Réessayez dans un instant.", "retry"),
  thanks: status(
    "✓",
    "Demande reçue",
    "Demande envoyée",
    ["Merci, ", "c’est bien reçu."],
    "Nous vous rappelons au numéro indiqué pour convenir du prix et du créneau.",
    "home",
  ),
  callLabel: f => (f.phone ? `Appeler le ${f.phone}` : "Nous appeler"),
  whatsappLabel: "WhatsApp",
  whatsappShort: "WhatsApp",
  whatsappMessage: () => "Bonjour, je vous contacte depuis le site Vifnet.",
  ctaShort: "Réserver",
  backHome: "Retour à l’accueil",
  tryAgain: "Réessayer",
  statusStrip: [],
  langName: "Français",
  facts: () => ["Vifnet", "Mentions légales en cours de rédaction"],
  nav: { pricing: "Tarifs", guarantee: "Garantie", reviews: "Avis", about: "À propos", menu: "Menu", book: "Réserver", home: "Vifnet — accueil" },
  rating: { value: "4,9", count: "(340)" },
  hero: {
    title: { first: "Une maison", second: "enfin ", accent: "vraiment", third: "propre." },
    lede: "Vifnet envoie chez vous une équipe professionnelle et assurée. Vous retrouvez un intérieur soigné — sans rien bâcler.",
    reviews: "340 avis Google cinq étoiles",
    chips: ["Assurés et cautionnés", "Antécédents vérifiés", "Satisfaction garantie à 100 %", "Disponible le jour même"],
  },
  quote: {
    labels: { mobile: "Téléphone", locality: "Code postal", bedrooms: "Chambres", subject: "Prestation" },
    placeholders: { mobile: "Numéro de téléphone", locality: "Code postal" },
    bedroomsPlaceholder: "Nombre de chambres",
    afterPhone: "Numéro gardé entre nous · rappel sous 15 min.",
    priceLine: "env. {price}",
    priceTaxCredit: "{price} après crédit d’impôt",
    callback: "Rappel",
    needQuestion: "Quel ménage ?",
    shortLabels: {
      bedrooms: { studio: "Studio", "1": "1", "2": "2", "3": "3", "4": "4", "5-plus": "5+" },
      surface: { "under-40": "< 40", "40-70": "40–70", "70-100": "70–100", "over-100": "> 100" },
      frequency: { weekly: "Semaine", biweekly: "2 sem.", monthly: "Mois", once: "Une fois" },
    },
    best: "Le plus avantageux",
    seePrices: "Voir les prix",
    unknown: {
      title: "Pas de souci, on estime pour vous",
      lede: "Envoyez 2–3 photos ou laissez votre numéro : nous rappelons avec un devis ferme.",
    },
    bedrooms: { studio: "Studio", "1": "1 chambre", "2": "2 chambres", "3": "3 chambres", "4": "4 chambres", "5+": "5 chambres et plus" },
    doneTitle: "C’est noté !",
    doneBody: ["Nous appelons le ", " d’ici 15 minutes avec un devis ferme."],
    messenger: {
      words: {
        messagePrice: "Estimation vue sur le site : env. {price} / passage",
        messageTiming: "Fréquence : {timing}",
        messengerPreviewPrice: "env. {price}",
        messengerOptionWhatsappNote: "Recommandé · devis déjà rédigé",
        messengerOptionCallNote: "On vous rappelle sous 15 min",
        messengerWhatsappHint: "Devis rédigé dans WhatsApp · numéro facultatif.",
        messengerPreviewTitle: "Votre devis est prêt à envoyer",
        messengerChipWhatsapp: "Réponse sur WhatsApp · 15 min",
        messengerChipCall: "Réponse par appel · 15 min",
        messengerChange: "Autre canal",
        messengerReturnBody: "Si oui, on vous répond sur {channel} en ~15 min, référence {ref}.",
        messengerQrLede: "Le devis s’ouvre dans WhatsApp, déjà rédigé.",
        messengerQrWeb: "ou WhatsApp Web →",
        messengerQrAlt: "QR code qui ouvre WhatsApp avec votre devis",
        messengerPhoneOptional: "Tél. (facultatif)",
      },
      swapLede: "Votre devis est prêt : envoyez-le-nous sur WhatsApp.",
      callNow: "Être rappelé sous 15 min",
      sheet: {
        messengerOptionWhatsappNote: "Le devis s’ouvre déjà rédigé",
        messengerOptionTelegramNote: "Via notre bot",
        messengerOptionCall: "Être rappelé",
        messengerOptionCallNote: "Sous 15 min",
      },
      previewLabels: {
        bedrooms: { studio: "Studio", "1": "1 ch.", "2": "2 ch.", "3": "3 ch.", "4": "4 ch.", "5-plus": "5+ ch." },
        surface: { "under-40": "< 40 m²", "40-70": "40–70 m²", "70-100": "70–100 m²", "over-100": "> 100 m²" },
        frequency: { weekly: "Semaine", biweekly: "2 sem.", monthly: "Mois", once: "Une fois" },
      },
    },
  },
  stats: [
    { value: "500+", label: "Logements nettoyés" },
    { value: "4,9★", label: "340 avis Google" },
    { value: "100 %", label: "Cautions récupérées" },
    { value: "< 2 h", label: "Délai de réponse moyen" },
  ],
  services: {
    eyebrow: "Nos prestations",
    title: "Choisissez votre ménage.",
    lede: "Chaque prestation est couverte par notre garantie satisfaction écrite. Pas satisfait ? Nous revenons gratuitement.",
    badge: "Le plus demandé",
    note: "Les photos ci-dessus viennent de vrais logements clients — pas d’une banque d’images. ",
    noteLink: "Réserver une prestation →",
    fromPrice: amount => `À partir de ${amount}`,
    items: {
      standard: {
        name: "Ménage standard",
        tagline: "L’entretien courant, bien fait.",
        points: [
          "Plans de travail et façades d’électroménager",
          "Salles de bain récurées",
          "Sols aspirés et lavés",
          "Dépoussiérage complet",
          "Poubelles vidées · Lits faits",
        ],
        price: "Sur devis",
      },
      deep: {
        name: "Grand ménage",
        tagline: "Du sol au plafond. Rien n’est oublié.",
        points: [
          "Tout le ménage standard",
          "Intérieur du four et du réfrigérateur",
          "Plinthes, moulures et rebords de fenêtre",
          "Intérieur des placards et tiroirs",
          "Joints et carrelage frottés en détail",
        ],
        price: "Sur devis",
      },
      move: {
        name: "Entrée / sortie",
        tagline: "Récupérez votre caution — garanti.",
        points: [
          "Niveau grand ménage partout",
          "Intérieur de tous les appareils",
          "Chaque placard, étagère et recoin",
          "Garage balayé",
          "Garantie de caution écrite",
        ],
        price: "Sur devis",
      },
      "post-construction": {
        name: "Fin de chantier",
        tagline: "Nous apportons le matériel lourd.",
        points: [
          "Poussière de chantier éliminée",
          "Projections de peinture et colle",
          "Surfaces essuyées et lustrées",
          "Aspiration à filtre HEPA",
          "Évacuation des gravats sur demande",
        ],
        price: "Sur devis",
      },
    },
  },
  reviews: {
    eyebrow: "Ce que disent nos clients",
    title: "Ne nous croyez pas sur parole.",
    google: "Lire les 340 avis Google ↗",
    average: "4,9 de moyenne",
    total: "· 340 avis vérifiés",
    cta: "Rejoignez-les — réservez aujourd’hui →",
    items: {
      amanda: {
        name: "Amanda R.",
        city: "Meridian, ID",
        verified: "Vérifié · août 2025",
        quote:
          "« J’ai dû essayer six services de ménage au fil des ans. Vifnet est le premier où, en rentrant, je ne pouvais vraiment pas dire que quelqu’un était passé — dans le meilleur sens du terme. Chaque recoin. Mon four a l’air neuf. Désormais, c’est toutes les deux semaines. »",
        photos: { result: "La cuisine d’Amanda — le four qui « a l’air neuf », selon elle", job: "L’équipe le jour de l’intervention" },
      },
      jordan: {
        name: "Jordan T.",
        city: "Boise, ID",
        verified: "Vérifié · juil. 2025",
        quote:
          "« Appelé à 9 h un vendredi, ils étaient chez moi à 13 h. J’ai quitté ma location le lendemain matin et récupéré toute ma caution. Ponctuels, minutieux, et ils s’en soucient vraiment. »",
      },
      marcus: {
        name: "Marcus et Deb F.",
        city: "Eagle, ID",
        verified: "Vérifié · mai 2025",
        quote:
          "« Ménage après la rénovation de notre cuisine. La poussière de chantier va partout. Deux heures plus tard, toute la maison sentait le propre et chaque surface était impeccable. Le travail sur l’escalier était incroyable. »",
        photos: {
          result: "L’escalier après le ménage de fin de chantier — chez Marcus et Deb",
          job: "L’escalier en cours d’intervention — encore un chantier à ce stade",
        },
      },
      keisha: {
        name: "Keisha M.",
        city: "Nampa, ID",
        verified: "Vérifié · juin 2025",
        quote:
          "« Polis, rapides, minutieux. Ils ont nettoyé mon four mieux que le jour où j’ai acheté la maison. J’ai réservé un passage hebdomadaire sur-le-champ. Mon mari m’a littéralement demandé si nous avions acheté de nouveaux appareils. »",
      },
      priya: {
        name: "Priya S.",
        city: "Boise, ID",
        verified: "Vérifié · avr. 2025",
        quote:
          "« Les salles de bain brillent, les chambres des enfants sont enfin rangées, et ils ne négligent rien. Les fenêtres — chaque cadre, chaque rebord, la vitre elle-même. Je n’en revenais pas. Une équipe attentionnée. »",
        photos: { result: "Les fenêtres de Priya après le ménage — elle « n’en revenait pas »", job: "Les fenêtres dont parle Priya" },
      },
      carl: {
        name: "Carl B.",
        city: "Caldwell, ID",
        verified: "Vérifié · mars 2025",
        quote:
          "« Je gère une location courte durée et les rotations doivent être rapides et parfaites. Vifnet est désormais mon seul appel. Ils arrivent dans le créneau, ne dépassent jamais le temps prévu, et les voyageurs mettent 5 étoiles à la propreté à chaque fois. »",
      },
    },
  },
  guarantee: {
    title: "Satisfaction garantie à 100 %",
    body: "Une zone ne vous convient pas ? Prévenez-nous dans les 24 heures. Nous revenons la nettoyer sans frais — sans discussion, sans petites lignes.",
  },
  faqEyebrow: "Questions fréquentes",
  faqTitle: "Vous vous demandez sans doute…",
  // Only the first answer is in the frame; the others say what the page itself claims.
  faqs: [
    {
      q: "Dois-je être présent ?",
      a: "Pas du tout. Beaucoup de clients nous confient une clé ou un code d’accès. Chaque membre de l’équipe a des antécédents vérifiés et nous sommes entièrement assurés.",
    },
    {
      q: "Et si je ne suis pas satisfait ?",
      a: "Prévenez-nous dans les 24 heures : nous revenons nettoyer la zone sans frais — c’est notre garantie satisfaction à 100 %.",
    },
    {
      q: "Apportez-vous vos produits ?",
      a: "Oui. L’équipe arrive avec tout le nécessaire — produits et matériel. Si vous souhaitez que nous utilisions un produit en particulier, dites-le-nous.",
    },
    {
      q: "Comment se passe le paiement ?",
      a: "Vous payez une fois le ménage terminé. Nous confirmons les moyens de paiement en vous rappelant avec votre devis.",
    },
    {
      q: "Puis-je programmer un passage régulier ?",
      a: "Oui — chaque semaine, toutes les deux semaines ou chaque mois. Dites-nous ce qui vous convient lors de notre rappel : nous gardons le même créneau.",
    },
    {
      q: "Êtes-vous assurés et cautionnés ?",
      a: "Oui. Vifnet est entièrement assurée et cautionnée, et chaque membre de l’équipe a des antécédents vérifiés.",
    },
  ],
  faqMore: "Une autre question ? ",
  closing: {
    title: "Retrouvez une maison propre ce soir.",
    lede: "60 secondes pour demander. Rappel en moins de 15 minutes avec un prix fixe.",
    cta: "Devis gratuit →",
  },
  footer: { copyright: year => `© ${year} Vifnet House Cleaning · Boise, Idaho`, privacy: "Confidentialité", terms: "Conditions" },
  heads: {
    prices: {
      eyebrow: "Tarifs",
      title: "Chaque ménage, chaque prix.",
      lede: "Des prix forfaitaires pour chaque prestation, annoncés avant notre venue. Chacune est couverte par notre garantie satisfaction écrite.",
    },
    guarantee: {
      eyebrow: "Notre garantie",
      title: "Pas satisfait ? Nous revenons gratuitement.",
      lede: "Une zone ne vous convient pas ? Prévenez-nous dans les 24 heures. Nous revenons la nettoyer sans frais — sans discussion, sans petites lignes.",
    },
    about: {
      eyebrow: "À propos de Vifnet",
      title: "L’équipe à votre porte.",
      lede: "Qui nettoie chez vous, comment l’équipe est vérifiée, et où nous allons autour de Boise.",
    },
  },
  priceTable: {
    eyebrow: "Ce que ça coûte",
    title: "Choisissez votre ménage.",
    lede: "Le point de départ de chaque prestation. Nous vous rappelons en moins de 15 minutes avec votre prix forfaitaire.",
    caption: "Ce que coûte chaque ménage",
    columns: { service: "Prestation", included: "Ce qui est inclus", price: "À partir de" },
    from: "À partir de",
    rows: {
      standard: { label: "Au téléphone", amount: "Sur devis" },
      deep: { label: "Au téléphone", amount: "Sur devis" },
      move: { label: "Au téléphone", amount: "Sur devis" },
      "post-construction": { label: "Au téléphone", amount: "Sur devis" },
    },
    note: "Vous payez après le ménage, une fois satisfait — toutes les grandes cartes, Venmo et Zelle. Les clients réguliers, chaque semaine ou toutes les deux semaines, bénéficient d’un tarif réduit.",
  },
  promises: {
    eyebrow: "Pourquoi on hésite à réserver",
    title: "Quatre inquiétudes, quatre réponses.",
    lede: "Chaque prestation est couverte par notre garantie satisfaction écrite. Voici ce qu’elle couvre.",
    items: [
      {
        worry: "« Ils vont oublier la moitié de la maison. »",
        title: "Pas satisfait ? Nous renettoyons gratuitement.",
        body: "Prévenez-nous dans les 24 heures. Nous revenons nettoyer la zone sans frais — sans discussion, sans petites lignes.",
      },
      {
        worry: "« Je ne veux pas d’inconnus chez moi. »",
        title: "Assurés, cautionnés, antécédents vérifiés.",
        body: "Chaque membre de l’équipe a des antécédents vérifiés, et nous sommes couverts par une assurance responsabilité civile. Justificatifs sur demande.",
      },
      {
        worry: "« Le prix va grimper. »",
        title: "Un prix forfaitaire avant notre venue.",
        body: "Nous vous rappelons en moins de 15 minutes avec un prix forfaitaire. Vous payez après le ménage, une fois satisfait.",
      },
      {
        worry: "« Je vais perdre ma caution de toute façon. »",
        title: "Une garantie de caution écrite.",
        body: "Chaque ménage d’entrée ou de sortie est assorti d’une garantie de caution écrite. Nos clients récupèrent leur caution dans 100 % des cas.",
      },
    ],
  },
  steps: {
    eyebrow: "Comment ça marche",
    title: "Trois étapes vers une maison propre.",
    items: [
      { title: "Demandez un devis.", body: "60 secondes pour demander. Rappel en moins de 15 minutes avec un prix fixe." },
      {
        title: "Votre équipe arrive.",
        body: "Une équipe professionnelle et assurée vient chez vous avec des produits et du matériel de qualité professionnelle. Vous n’avez pas besoin d’être là.",
      },
      {
        title: "Payez une fois satisfait.",
        body: "Paiement après le ménage — toutes les grandes cartes, Venmo et Zelle. Une zone ne vous convient pas ? Prévenez-nous dans les 24 heures : nous la renettoyons gratuitement.",
      },
    ],
  },
  team: {
    eyebrow: "Les personnes chez vous",
    title: "Rencontrez l’équipe.",
    lede: "Chaque membre de l’équipe a des antécédents vérifiés. Nous sommes entièrement assurés et cautionnés.",
    facts: "Antécédents vérifiés · Assuré et cautionné",
    members: [
      { initials: "AR", name: "Ana R.", role: "Cheffe d’équipe" },
      { initials: "LM", name: "Luis M.", role: "Spécialiste du grand ménage" },
      { initials: "HK", name: "Hannah K.", role: "Responsable entrées et sorties" },
      { initials: "DP", name: "Dev P.", role: "Équipe fin de chantier" },
    ],
  },
  area: {
    eyebrow: "Zone d’intervention",
    title: "Boise et les villes alentour.",
    lede: "Boise, Meridian, Eagle, Nampa et Caldwell — les villes d’où nos clients nous écrivent. Vous ne savez pas si vous êtes dans la zone ? Demandez-le-nous lors de notre rappel.",
    towns: ["Boise", "Meridian", "Eagle", "Nampa", "Caldwell"],
  },
  sticky: { title: "Prêt pour une maison impeccable ?", lede: "Réservation possible le jour même", call: "Appeler", book: "Réserver" },
  brandPage: { title: "Vifnet", description: "Ménage à domicile.", open: "Ouvrir" },
} satisfies Text;
