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

// The Figma frame's words, verbatim (Desktop 1440 9:107), quote marks and all.
// Its figures, reviews and prices are the file's sample content (OWNER_TODO
// "design sample content").
export const EN = {
  pages: {
    home: {
      title: () => "Vifnet — home cleaning",
      description: () =>
        "Deep cleans, upholstery and outdoor areas, at your place. Describe the job in a minute: we call you back.",
    },
    prices: {
      title: () => "Home cleaning prices",
      description: () => "Flat prices for every service, quoted before we come. Pay after the clean, once you’re satisfied.",
    },
    guarantee: {
      title: () => "Our satisfaction guarantee",
      description: () => "Not happy with any area? Tell us within 24 hours and we come back to re-clean it at no charge.",
    },
    about: {
      title: () => "About the team",
      description: () => "Who cleans your home, how the team is vetted, and where we go.",
    },
  },
  quoteForm: {
    title: "Get your free quote",
    lede: "We call back in under 15 minutes.",
    submit: "Get My Free Quote →",
    privacy: "Your number is used for this request only.",
    reassurance: () => "We call you back on the number you give.",
    honeypotLabel: "Website",
  },
  notFound: status(
    "404",
    "Page not found",
    "Error 404",
    ["This page ", "does not exist."],
    "The address leads to no page of this site. The quote is still one click away.",
    "home",
  ),
  serverError: status("500", "Error", "Error 500", ["Something broke ", "on our side."], "Try again in a moment.", "retry"),
  thanks: status(
    "✓",
    "Request received",
    "Request sent",
    ["Thank you, ", "it’s in."],
    "We call you back on the number you gave to agree on the price and the time.",
    "home",
  ),
  callLabel: f => (f.phone ? `Call ${f.phone}` : "Call us"),
  whatsappLabel: "WhatsApp",
  whatsappShort: "WhatsApp",
  whatsappMessage: () => "Hello, I am writing from the Vifnet site.",
  ctaShort: "Book Now",
  backHome: "Back to the home page",
  tryAgain: "Try again",
  statusStrip: [],
  langName: "English",
  facts: () => ["Vifnet", "Legal notice in preparation"],
  nav: { pricing: "Pricing", guarantee: "Guarantee", reviews: "Reviews", about: "About", menu: "Menu", book: "Book Now", home: "Vifnet — home" },
  rating: { value: "4.9", count: "(340)" },
  hero: {
    title: { first: "A home that", second: "feels ", accent: "genuinely", third: "clean." },
    lede: "Vifnet sends a professional, insured team to your door. You come back to a place that feels cared for — no corners cut.",
    reviews: "340 five-star Google reviews",
    chips: ["Fully insured & bonded", "Background-checked", "100% satisfaction guarantee", "Same-day available"],
  },
  quote: {
    labels: { mobile: "Phone", locality: "ZIP code", bedrooms: "Bedrooms", subject: "Service" },
    placeholders: { mobile: "Phone number", locality: "ZIP code" },
    bedroomsPlaceholder: "Number of bedrooms",
    afterPhone: "Your number stays with us · call back in 15 min.",
    priceLine: "approx. {price}",
    priceTaxCredit: "{price} after tax credit",
    callback: "Call back",
    needQuestion: "Which clean?",
    shortLabels: {
      bedrooms: { studio: "Studio", "1": "1", "2": "2", "3": "3", "4": "4", "5-plus": "5+" },
      surface: { "under-40": "< 40", "40-70": "40–70", "70-100": "70–100", "over-100": "> 100" },
      frequency: { weekly: "Weekly", biweekly: "2 wks", monthly: "Monthly", once: "Once" },
    },
    best: "Best value",
    seePrices: "See prices",
    unknown: {
      title: "No problem, we’ll estimate it",
      lede: "Send 2–3 photos or leave your number: we call back with a firm quote.",
    },
    bedrooms: { studio: "Studio", "1": "1 bedroom", "2": "2 bedrooms", "3": "3 bedrooms", "4": "4 bedrooms", "5+": "5+ bedrooms" },
    doneTitle: "You're all set!",
    doneBody: ["We'll call ", " within 15 minutes with a firm quote."],
    messenger: {
      words: {
        messagePrice: "Estimate seen on the site: about {price} / visit",
        messageTiming: "Frequency: {timing}",
        messengerPreviewPrice: "about {price}",
        messengerOptionWhatsappNote: "Recommended · quote already written",
        messengerOptionCallNote: "We call you back within 15 min",
        messengerWhatsappHint: "Quote written in WhatsApp · number optional.",
        messengerPreviewTitle: "Your quote is ready to send",
        messengerChipWhatsapp: "Answer on WhatsApp · 15 min",
        messengerChipCall: "Answer by phone · 15 min",
        messengerChange: "Other channel",
        messengerReturnBody: "If so, we answer you on {channel} within ~15 min, reference {ref}.",
        messengerQrLede: "The quote opens in WhatsApp, already written.",
        messengerQrWeb: "or WhatsApp Web →",
        messengerQrAlt: "QR code that opens WhatsApp with your quote",
        messengerPhoneOptional: "Phone (optional)",
      },
      swapLede: "Your quote is ready: send it to us on WhatsApp.",
      callNow: "Call me back within 15 min",
      sheet: {
        messengerOptionWhatsappNote: "The quote opens already written",
        messengerOptionTelegramNote: "Through our bot",
        messengerOptionCall: "Call me back",
        messengerOptionCallNote: "Within 15 min",
      },
      previewLabels: {
        bedrooms: { studio: "Studio", "1": "1 bd.", "2": "2 bd.", "3": "3 bd.", "4": "4 bd.", "5-plus": "5+ bd." },
        surface: { "under-40": "< 40 m²", "40-70": "40–70 m²", "70-100": "70–100 m²", "over-100": "> 100 m²" },
        frequency: { weekly: "Weekly", biweekly: "2 wks", monthly: "Monthly", once: "Once" },
      },
    },
  },
  stats: [
    { value: "500+", label: "Homes cleaned" },
    { value: "4.9★", label: "340 Google reviews" },
    { value: "100%", label: "Deposit-back success rate" },
    { value: "< 2 hr", label: "Average response time" },
  ],
  services: {
    eyebrow: "What we do",
    title: "Pick your clean.",
    lede: "Every service backed by our written satisfaction guarantee. Not happy? We come back free.",
    badge: "Most popular",
    note: "Photos above are from actual client homes — not stock photography. ",
    noteLink: "Book any service →",
    fromPrice: amount => `From ${amount}`,
    items: {
      standard: {
        name: "Standard Clean",
        tagline: "Regular upkeep done right.",
        points: ["Kitchen surfaces & appliance exteriors", "Bathrooms scrubbed", "All floors vacuumed & mopped", "Dusting throughout", "Trash emptied · Beds made"],
        price: "Custom quote",
      },
      deep: {
        name: "Deep Clean",
        tagline: "Top-to-bottom. Nothing missed.",
        points: ["Everything in Standard", "Inside oven & refrigerator", "Baseboards, trim & window sills", "Inside cabinets & drawers", "Detailed grout & tile scrub"],
        price: "Custom quote",
      },
      move: {
        name: "Move-In / Move-Out",
        tagline: "Get your deposit back — guaranteed.",
        points: ["Deep-clean level throughout", "Inside all appliances", "Every closet, shelf & corner", "Garage sweep", "Written deposit guarantee"],
        price: "Custom quote",
      },
      "post-construction": {
        name: "Post-Construction",
        tagline: "We bring the heavy-duty gear.",
        points: ["Construction dust removal", "Paint overspray & adhesive", "All surfaces wiped & polished", "HEPA filtration vacuuming", "Debris haul on request"],
        price: "Custom quote",
      },
    },
  },
  reviews: {
    eyebrow: "What clients say",
    title: "Don't take our word for it.",
    google: "Read all 340 Google reviews ↗",
    average: "4.9 average",
    total: "· 340 verified reviews",
    cta: "Join them — Book today →",
    items: {
      amanda: {
        name: "Amanda R.",
        city: "Meridian, ID",
        verified: "Verified · Aug 2025",
        quote:
          "\"I've tried maybe six cleaning services over the years. Vifnet is the first one where I came home and genuinely couldn't tell anyone had been there — in the best way. Every single corner. My oven looks brand new. Recurring bi-weekly now.\"",
        photos: { result: "Amanda's kitchen — the oven she said 'looks brand new'", job: "The team on arrival day" },
      },
      jordan: {
        name: "Jordan T.",
        city: "Boise, ID",
        verified: "Verified · Jul 2025",
        quote:
          "\"Called at 9am on a Friday, they were at my house by 1pm. Moved out of my rental the next morning and got my full deposit back. Punctual, thorough, and they actually care.\"",
      },
      marcus: {
        name: "Marcus & Deb F.",
        city: "Eagle, ID",
        verified: "Verified · May 2025",
        quote:
          "\"Post-renovation clean after our kitchen remodel. Construction dust gets everywhere. Two hours later, the whole house smelled fresh and every surface was spotless. The staircase detail was incredible.\"",
        photos: {
          result: "Staircase after the post-construction clean — Marcus & Deb's home",
          job: "Mid-job on the staircase — still a construction site at this point",
        },
      },
      keisha: {
        name: "Keisha M.",
        city: "Nampa, ID",
        verified: "Verified · Jun 2025",
        quote:
          "\"Polite, fast, thorough. They cleaned my oven better than the day I bought the house. Booked weekly service on the spot. My husband literally asked if we'd gotten new appliances.\"",
      },
      priya: {
        name: "Priya S.",
        city: "Boise, ID",
        verified: "Verified · Apr 2025",
        quote:
          "\"The bathrooms sparkle, the kids' rooms are actually organized, and they don't skip a thing. The windows — every frame, every sill, the glass itself. I could not believe it. Thoughtful team.\"",
        photos: { result: "Priya's windows after the clean — she said she 'could not believe it'", job: "The window work Priya described" },
      },
      carl: {
        name: "Carl B.",
        city: "Caldwell, ID",
        verified: "Verified · Mar 2025",
        quote:
          "\"I run a short-term rental and turnovers need to be fast and perfect. Vifnet is now my only call. Arrive within the window, never go over time, guests leave 5-star cleanliness reviews every time.\"",
      },
    },
  },
  guarantee: {
    title: "100% Satisfaction Guarantee",
    body: "Not happy with any area? Tell us within 24 hours. We come back and re-clean it at no charge — no questions asked, no fine print.",
  },
  faqEyebrow: "Common questions",
  faqTitle: "You're probably wondering…",
  // Only the first answer is in the frame; the others say what the page itself claims.
  faqs: [
    {
      q: "Do I need to be home?",
      a: "Not at all. Many clients give us a key or door code. Every team member is background-checked and we're fully insured.",
    },
    {
      q: "What if I'm not happy?",
      a: "Tell us within 24 hours and we come back to re-clean the area at no charge — that's our 100% satisfaction guarantee.",
    },
    {
      q: "Do you bring your own supplies?",
      a: "Yes. The team arrives with everything it needs — products and equipment. If you'd like us to use something specific, just let us know.",
    },
    { q: "How do I pay?", a: "You pay once the clean is done. We confirm the payment options when we call you back with your quote." },
    {
      q: "Can I set up a recurring schedule?",
      a: "Yes — weekly, every two weeks or monthly. Tell us what suits you when we call back and we'll keep the same slot.",
    },
    { q: "Are you insured and bonded?", a: "Yes. Vifnet is fully insured and bonded, and every team member is background-checked." },
  ],
  faqMore: "Still have a question? ",
  closing: {
    title: "Return to a clean home tonight.",
    lede: "60 seconds to request. We call back in under 15 minutes with a flat quote.",
    cta: "Get Free Quote →",
  },
  footer: { copyright: year => `© ${year} Vifnet House Cleaning · Boise, Idaho`, privacy: "Privacy", terms: "Terms" },
  heads: {
    prices: {
      eyebrow: "Pricing",
      title: "Every clean, every price.",
      lede: "Flat prices for every service, quoted before we come. Every one is backed by our written satisfaction guarantee.",
    },
    guarantee: {
      eyebrow: "Our guarantee",
      title: "Not happy? We come back free.",
      lede: "Not happy with any area? Tell us within 24 hours. We come back and re-clean it at no charge — no questions asked, no fine print.",
    },
    about: {
      eyebrow: "About Vifnet",
      title: "The team at your door.",
      lede: "Who cleans your home, how they’re vetted, and where around Boise we go.",
    },
  },
  priceTable: {
    eyebrow: "What it costs",
    title: "Pick your clean.",
    lede: "Where each service starts. We call back in under 15 minutes with your flat quote.",
    caption: "What each clean costs",
    columns: { service: "Service", included: "What's included", price: "From" },
    from: "From",
    rows: {
      standard: { label: "On the call", amount: "Custom quote" },
      deep: { label: "On the call", amount: "Custom quote" },
      move: { label: "On the call", amount: "Custom quote" },
      "post-construction": { label: "On the call", amount: "Custom quote" },
    },
    note: "Pay after the clean, once you’re satisfied — all major cards, Venmo, and Zelle. Weekly and bi-weekly clients get a discounted rate.",
  },
  promises: {
    eyebrow: "Why people put off booking",
    title: "Four worries, answered.",
    lede: "Every service is backed by our written satisfaction guarantee. Here is what that covers.",
    items: [
      {
        worry: "“They’ll miss half the house.”",
        title: "Not happy? We re-clean it free.",
        body: "Tell us within 24 hours. We come back and re-clean the area at no charge — no questions asked, no fine print.",
      },
      {
        worry: "“I don’t want strangers in my home.”",
        title: "Insured, bonded, background-checked.",
        body: "Every team member is background-checked, and we carry general liability insurance. Documentation available on request.",
      },
      {
        worry: "“The price will creep up.”",
        title: "A flat quote before we come.",
        body: "We call back in under 15 minutes with a flat quote. You pay after the clean, once you’re satisfied.",
      },
      {
        worry: "“I’ll lose my deposit anyway.”",
        title: "A written deposit guarantee.",
        body: "Every Move-In / Move-Out clean comes with a written deposit guarantee. Our deposit-back success rate is 100%.",
      },
    ],
  },
  steps: {
    eyebrow: "How it works",
    title: "Three steps to a clean home.",
    items: [
      { title: "Request a quote.", body: "60 seconds to request. We call back in under 15 minutes with a flat quote." },
      {
        title: "Your team arrives.",
        body: "A professional, insured team comes to your door with professional-grade products and equipment. You don’t need to be home.",
      },
      {
        title: "Pay once you’re satisfied.",
        body: "Payment after the clean — all major cards, Venmo, and Zelle. Not happy with any area? Tell us within 24 hours and we re-clean it free.",
      },
    ],
  },
  team: {
    eyebrow: "The people in your home",
    title: "Meet the team.",
    lede: "Every team member is background-checked. We’re fully insured and bonded.",
    facts: "Background-checked · Insured & bonded",
    members: [
      { initials: "AR", name: "Ana R.", role: "Team lead" },
      { initials: "LM", name: "Luis M.", role: "Deep-clean specialist" },
      { initials: "HK", name: "Hannah K.", role: "Move-out lead" },
      { initials: "DP", name: "Dev P.", role: "Post-construction crew" },
    ],
  },
  area: {
    eyebrow: "Service area",
    title: "Boise and the towns around it.",
    lede: "Boise, Meridian, Eagle, Nampa and Caldwell — the towns our clients write from. Not sure you’re in the area? Ask when we call back.",
    towns: ["Boise", "Meridian", "Eagle", "Nampa", "Caldwell"],
  },
  sticky: { title: "Ready for a spotless home?", lede: "Same-day booking available", call: "Call", book: "Book Now" },
  brandPage: { title: "Vifnet", description: "Home cleaning.", open: "Open" },
} satisfies Text;
