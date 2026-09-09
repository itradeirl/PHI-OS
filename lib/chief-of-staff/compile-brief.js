import { runAgent } from "./run-agent.js";
import { CHIEF_OF_STAFF_PROMPT, SECTION_TITLES, todayET } from "./routines.js";

// The final "Chief of Staff" synthesis call — compiles the individual agent
// reports into one plain-English brief. Ported from the inline block at the
// end of chief-of-staff.js's runChiefOfStaff(), unchanged in substance.
export async function compileBrief(trigger, routine, reports) {
  const todayLabel = todayET();

  const sectionList = Object.keys(reports)
    .map((name) => `"## ${SECTION_TITLES[name]}" (covers ${name}'s findings)`)
    .join("\n      ");

  return runAgent({
    systemPrompt: CHIEF_OF_STAFF_PROMPT,
    prompt: `
      Today's date: ${todayLabel}
      Routine: ${routine.name}
      Trigger: ${trigger}

      Agent reports received:
      ${JSON.stringify(reports, null, 2)}

      Compile the final PHI OS action brief.
      The very first line MUST be exactly this heading, with nothing added,
      removed, or reworded: "# ${routine.name} — ${todayLabel}"

      Use exactly these section headings, in this order, and no others
      (only the agents that actually reported this cycle are listed below —
      do not invent a section for an agent that isn't listed):
      ${sectionList}

      After those sections, add a "## Decisions" section with specific
      buy/hold/trim actions, then a "## Cash Allocation" section.
      Use the "Today's date" value above exactly as given for any date in
      the brief — do not calculate or guess the date yourself.
    `,
  });
}
