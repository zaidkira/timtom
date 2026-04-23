import cron from "node-cron";
import { db, taskGroupsTable, tasksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./lib/logger";

// Run every day at 00:00 (midnight)
cron.schedule("0 0 * * *", async () => {
  logger.info("Running daily task generation from task groups...");
  try {
    const today = new Date().getDay(); // 0 (Sunday) to 6 (Saturday)
    
    // Find all task groups that are supposed to recur today
    const activeGroups = await db.query.taskGroupsTable.findMany({
      where: (groups, { eq, and }) => and(
        eq(groups.recurrence, "weekly"),
        eq(groups.dayOfWeek, today)
      )
    });

    if (activeGroups.length === 0) {
      logger.info("No task groups scheduled for today.");
      return;
    }

    let tasksCreated = 0;
    
    // Create tasks for these groups
    for (const group of activeGroups) {
      const storeIds = group.storeIds;
      if (!storeIds || storeIds.length === 0) continue;

      const tasksToInsert = storeIds.map(storeId => ({
        distributorId: group.distributorId,
        storeId,
        items: [],
        status: "pending" as const,
        totalAmount: "0"
      }));

      if (tasksToInsert.length > 0) {
        await db.insert(tasksTable).values(tasksToInsert);
        tasksCreated += tasksToInsert.length;
      }
    }

    logger.info(`Successfully generated ${tasksCreated} tasks from ${activeGroups.length} task groups.`);
  } catch (error) {
    logger.error({ error }, "Failed to generate tasks from task groups");
  }
});
