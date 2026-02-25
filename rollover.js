const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

async function rolloverTasks() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayStr = today.toISOString().split("T")[0];

  console.log(`Running rollover for tasks on or before ${todayStr}...`);

  // Query for unchecked tasks with a "Do Date" on or before today
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      and: [
        {
          property: "Done?",
          checkbox: { equals: false },
        },
        {
          property: "Do Date",
          date: { on_or_before: todayStr },
        },
      ],
    },
  });

  const tasks = response.results;
  console.log(`Found ${tasks.length} task(s) to roll over.`);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  for (const task of tasks) {
    const title =
      task.properties.Name?.title?.[0]?.plain_text || "(untitled)";

    // Skip tasks with no title content
    if (!title || title === "(untitled)") {
      console.log(`Skipping untitled task ${task.id}`);
      continue;
    }

    await notion.pages.update({
      page_id: task.id,
      properties: {
        "Do Date": {
          date: { start: tomorrowStr },
        },
      },
    });

    console.log(`Rolled over: "${title}" → ${tomorrowStr}`);
  }

  console.log("Rollover complete.");
}

rolloverTasks().catch((err) => {
  console.error("Error during rollover:", err);
  process.exit(1);
});
