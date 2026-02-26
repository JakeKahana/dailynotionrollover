const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

async function rolloverTasks() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  console.log(`Running rollover for tasks with Do Date = ${todayStr}...`);

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
          date: { equals: todayStr },
        },
      ],
    },
  });

  const tasks = response.results;
  console.log(`Found ${tasks.length} task(s) to evaluate.`);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  for (const task of tasks) {
    const actionItem =
      task.properties["Action Item"]?.title?.[0]?.plain_text?.trim() || "";

    // Skip tasks where Action Item is blank
    if (!actionItem) {
      console.log(`Skipping task with blank Action Item (${task.id})`);
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

    console.log(`Rolled over: "${actionItem}" → ${tomorrowStr}`);
  }

  console.log("Rollover complete.");
}

rolloverTasks().catch((err) => {
  console.error("Error during rollover:", err);
  process.exit(1);
});
