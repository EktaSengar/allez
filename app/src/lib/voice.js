/* ---------------------------------------------------------
   Every word the app says that isn't a record's own.

   Kept in one file so the voice stays one voice (APP.md, "The voice"):
   warm, friendly, a little playful, inviting. The fun is in the frame;
   facts stay plain. One exclamation mark at most, and only for a
   celebration. The pigeon says "I" only in its own moments — the
   `pigeon` lines below — and everywhere else the app speaks as Allez.
   --------------------------------------------------------- */

export const V = {
  pigeon: {
    hello: 'Hello. I know this city by the pavement.',
    helloSub: 'Let me find you something good. First, one thing about you.',
    go: "Off you go. I'll be here after.",
    end: "That's today. Go on, pick one.",
    tired: "Most of the city's asleep. Me too, nearly.",
    lost: "Lost the signal. Here's what I remembered.",
    nothing: "I've looked everywhere close. Nothing's open just now.",
    celebrate: "That's one for the book.",
    regular: n => `Number ${n}. You're a regular now.`,
    looking: 'Having a look round…',
    match: n => n === 1 ? 'You both picked one thing. That settles it.' : `You both picked ${n} things. Here's your weekend.`,
    noMatch: "No overlap this time. I've planned from what you both half-liked."
  },

  today: {
    tab: 'Today',
    rightNow: 'Right now',
    afterWork: 'After work',
    tonight: 'Tonight',
    endsSoon: n => n <= 0 ? 'Last day' : n === 1 ? 'Ends tomorrow' : `Ends in ${n} days`,
    alsoNow: 'Also open now',
    weekendReady: 'Your weekend’s ready',
    weekendSub: 'Planned, in order, and open when you get there.',
    weekendGo: 'Have a look',
    tomorrow: t => `First thing tomorrow: ${t}`,
    tip: 'Worth knowing'
  },

  ask: {
    howLong: 'How long are you here?',
    howLongSub: 'It changes what I show you. You can change it any time.',
    live: 'I live here',
    moved: "I've just moved",
    until: "I'm here for a while",
    untilHow: 'Roughly how long?',
    untilOpts: [['Two weeks', 14], ['A month', 30], ['Two months', 61], ['Three months', 91]],
    hours: 'What hours do you work?',
    hoursSub: "So I don't suggest lunch when you're on a call.",
    hoursOpts: [['local', 'Local hours'], ['india', 'India hours'], ['europe', 'Europe hours'], ['odd', 'My hours are odd'], ['none', "I'm not working"]],
    thanks: 'Lovely. Carry on.'
  },

  card: {
    go: 'Go',
    save: 'Save',
    saved: 'Saved',
    less: 'Less like this',
    min: m => `${Math.round(m)} min`,
    openTill: t => `open till ${t}`,
    checked: d => `checked ${d}`
  },

  tiers: {
    personal: '★ we went',
    editorial: '◆ researched',
    sourced: '◇ on record',
    found: '· on the map'
  },

  weekend: {
    title: 'Your weekend',
    who: "Who's coming?",
    company: [['solo', 'Just me'], ['couple', 'A partner'], ['friends', 'Friends'], ['family', 'Kids'], ['dog', 'The dog']],
    slot: { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' },
    swap: 'Something else',
    empty: 'Nothing fits this slot. Have a lie-in.',
    match: 'Plan it together',
    matchSub: "Send them a deck. You both swipe, and I'll plan from what you agree on.",
    more: 'Show me more',
    spend: s => s ? `About ${s}` : null,
    walk: m => `${Math.round(m)} min from the last stop`
  },

  deck: {
    title: 'Swipe the weekend',
    sub: 'Right if you’d go. Left if not this time.',
    yes: 'I’d go',
    no: 'Not now',
    send: 'Send it to them',
    yourHalf: "Your half's done. Now theirs.",
    sendText: url => `Help me plan the weekend? Swipe these and send it back: ${url}`,
    waiting: 'Sent. When their reply comes, open the link or paste it here.',
    paste: 'Paste their reply',
    pasteHint: 'https://allez.city/match/#…',
    check: 'See what we agree on',
    saveAlone: 'Saved for some weekend.'
  },

  go: {
    title: 'Off you go',
    directions: 'Directions',
    know: 'Good to know',
    after: 'After this',
    afterNone: 'Head home happy. Nothing else close is open.',
    here: "I'm here",
    hereDone: "Enjoy it. I'll ask how it was later.",
    book: 'Book'
  },

  how: {
    title: t => `How was ${t}?`,
    loved: 'Loved it',
    good: 'It was fine',
    meh: 'Not for me',
    skipped: "Didn't go",
    anyway: 'Would you have gone anyway?',
    yes: 'Probably',
    no: 'No, this was new',
    line: 'One line to remember it by',
    linePlaceholder: 'The cardamom bun. Enough said.',
    photo: 'Add your photo',
    make: 'Make the postcard',
    skippedThanks: "Fair enough. I'll find something better."
  },

  city: {
    tab: 'My city',
    title: 'My city',
    stats: (o, z) => `${o} ${o === 1 ? 'outing' : 'outings'} · ${z} ${z === 1 ? 'neighbourhood' : 'neighbourhoods'}`,
    empty: 'Your postcards will live here. Go somewhere first.',
    regulars: 'Your regulars',
    knows: 'What Allez knows about you',
    countdown: (d, n) => `Day ${d} of ${n}`,
    share: 'Share'
  },

  me: {
    title: 'What Allez knows about you',
    sub: 'This is all of it, and it stays on your phone. Tap anything to change it.',
    here: { live: 'You live here.', moved: 'You moved here recently.', until: d => `You're here until ${d}.` },
    hours: { local: 'You work local hours.', india: 'You work India hours.', europe: 'You work Europe hours.', odd: 'Your hours are your own.', none: "You're not working.", unset: "I don't know your hours yet." },
    company: c => c ? `You usually go out with: ${c}.` : "I don't know who you go out with yet.",
    loved: n => n ? `You've loved ${n} ${n === 1 ? 'place' : 'places'}.` : 'You haven’t rated anything yet.',
    novelty: ['Mostly what I know', 'A bit of both', 'Mostly new things'],
    noveltyTitle: 'Known and new',
    reset: 'Start again',
    resetConfirm: 'Forget everything?'
  },

  notify: {
    weekendTitle: 'Your weekend’s ready',
    weekendBody: first => first ? `Saturday starts at ${first}. Have a look.` : 'Have a look before it fills up.',
    howTitle: t => `How was ${t}?`,
    howBody: 'One tap. It makes tomorrow better.'
  }
};
