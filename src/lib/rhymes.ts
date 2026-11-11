/**
 * Rhymes shown on the loading screen — one is picked at random on every
 * page load / refresh.
 *
 * To add more rhymes, append entries to the array below. Each rhyme is an
 * array of lines; an empty string "" renders a stanza break:
 *
 *   ["line one", "line two"],
 *   ["first line", "", "second stanza line"],
 *
 * The loader types them out per-character and reserves a fixed-height
 * block, so rhymes of any length fit without layout shift.
 */

export const RHYMES: string[][] = [
  [
    "Pimping sluts",
    "Pimping hoes",
    "Riding clean smoking dope",
    "With my main bitch",
    "Pussy soaking as she give me throat",
  ],
  [
    "Oh, you think you're dope?",
    "I'm tighter than the rope around your fucking throat",
    "I'll be the last thing you see before you fucking choke",
  ],
  [
    "Knock the piss out a pussy boy, trust",
    "Snort a thirty off the .40, let it bust",
    "Give me bread, watch how quick I start to duck",
    "I put FENTY on her toes, she put Fenty in my cup",
    "What with all this racket? What the fuck with all this fuss?",
    "Ruby unapproachable, but still, they bound rush",
  ],
  [
    "Got a pound in the blunt, I'm loungin'",
    "Pour another round, I'm drownin'",
    "Climb to the top, I will jump off the mountain",
  ],
  [
    "Living on this earth is parallel to living in hell",
    "I can't seem to break the spell",
  ],
  [
    "Used to love the bitch, now she sucking other dicks",
    "So I cut my fucking wrists",
    "Feel like a puddle of piss",
    "$uicide, death of me who gives a fuck",
    "No one",
  ],
  [
    "Monkey mother fuckers, give them all banana clips",
    "Water on my lips smoking dope with the clique",
  ],
  [
    "motherfucker, if you're looking for me, find me in the night",
    "I got a knife, don't wanna fight",
    "I wanna take your fucking life, and end it on the sight",
    "With a Sythe",
    "When I strike, if you bark, better bite",
  ],
  [
    "I sat in an all black ride, tint rolled up when I'm high",
    "Said they all wanna live but I just wanna die",
  ],
  [
    "Crucify ghosts in a frozen abyss, ocean of planets in total eclipse",
    "Nowhere I wander, wherever I drift, usin' a razor to open my wrists",
  ],
  [
    "Flip my fuckin' cross, I don't need a Messiah",
    "",
    "Fuck that crown of thorns, I got a crown of barbwire",
    "",
    "Burn a fuckin' church, light a blunt with the fire",
    "",
    "Fumes got my head spinnin' like a fucking tire",
  ],
  [
    "Ruby such a Misfit",
    "Hollywood Babylon can't resist it",
    "Fuck a cop bitch",
    "I'm ducking all these piglets",
    "7th Ward be my motherfucking district",
    "Yeah, I still got my motherfucking wrist slit",
    "Bleeding like a pissed bitch",
  ],
  [
    "Still got the badge, still got the gun",
    "Still got the patch, still got the stun",
    "Still got the cash, bitch, I burn it for fun",
    "Put the Glock to my skull then I am done",
  ],
  [
    "They figure me a dead motherfucker",
    "But I'm just a motherfucker that wanna be dead",
    "Snow Leopard with the lead in his head, turnin' me into a sweater",
    "Bitches use me as their fucking bedspread",
  ],
  [
    "blunt lit, lungs itch, bitch, I like the sting",
    "Smoking potent thinking I'm the chosen one, bitch, I'm a king",
    "I can hear my dead homies sing",
    "Now my eyes always hurtin', wiping tears with diamond rings,",
  ],
  [
    "I got a fever",
    "And my sickness now is rising quick",
    "",
    "Breaking the meter",
    "Body temperature is 666",
  ],
  [
    "Cuz jealousy make a man go crazy",
    "Money make a motherfucker hate me",
    "1000 bitches they all wanna date me",
  ],
  [
    "Still pissed at my daddy that he nutted in my momma",
    "",
    "Crushing 911",
    "Boy, i am feeling like osama",
  ],
  [
    "Underground obama",
    "and my .44 will give the speech",
    "",
    "Thats when they call me high",
    "Man i am fucking out of reach",
  ],
  [
    "I'm out of my mind, see fear in your eyes",
    "I'm sick, I despise myself again",
    "The tears never come, my body is numb",
    "I feel like a god amongst the men",
  ],
  [
    "Crucify me with the nails in my feet",
    "With the nails in my wrist and that blade in my chest",
    "Enlightened by Zion",
    "I'm wearing lion with teeth on a rope that surrounding my neck",
  ],
  [
    "Money what I'm about",
    "Too much cash to count",
    "",
    "Keep that bitch outside, ain't no hoes up in my house",
    "",
    "Smokin' out the ounce,",
    "I'm watchin' recession",
    "",
    "My bitch want affection,",
    "but I'm busy cleanin' weapons",
  ],
];

/* localStorage key tracking the most recently displayed rhyme, so a
   refresh can never immediately repeat it. */
const LAST_RHYME_KEY = "ka-last-rhyme-idx";

/**
 * Pick the index of the next rhyme: uniformly random, but never the same
 * as the previously displayed one (tracked in localStorage across
 * refreshes). If storage is unavailable (private mode, blocked storage)
 * it degrades to plain random — the site never breaks over a rhyme.
 */
export function pickRhymeIndex(): number {
  const total = RHYMES.length;
  if (total <= 1) return 0;

  let last: number | null = null;
  try {
    const raw = window.localStorage.getItem(LAST_RHYME_KEY);
    if (raw !== null) {
      const parsed = Number.parseInt(raw, 10);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed < total) {
        last = parsed;
      }
    }
  } catch {
    /* storage unavailable — fall through to plain random */
  }

  let idx = Math.floor(Math.random() * total);
  if (last !== null && idx === last) {
    // Redraw uniformly among the other (total - 1) rhymes
    idx = (idx + 1 + Math.floor(Math.random() * (total - 1))) % total;
  }

  try {
    window.localStorage.setItem(LAST_RHYME_KEY, String(idx));
  } catch {
    /* ignore — worst case, immediate repeats become possible again */
  }
  return idx;
}
