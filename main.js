const fs = require('fs');
const path = require('path');

async function processActivities(directory) {
  try {
    const files = await fs.promises.readdir(directory);
    const results = [];

    for (const file of files) {
      if (path.extname(file) === '.json') {
        const filePath = path.join(directory, file);
        const fileContent = await fs.promises.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);

        let distance = jsonData.distance;
        if (distance === undefined) {
          distance = 0;
        }

        const dateString = file.split('-').slice(0, 3).join('-'); //Extract YYYY-MM-DD
        const date = new Date(dateString);

        if (jsonData.sport == "Running") {
          results.push({ date: date, distance: distance });
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error processing activities:', error);
    return [];
  }
}

const kmToMi = (km) => km / 1.6;

function calculateSlidingWindowStats(activityData) {
  const windowSizeDays = 7;
  const results = [];
  
  for (let i = 0; i < activityData.length; i++) {
    const startDate = activityData[i].date;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + windowSizeDays - 1);

    // TODO optimize
    const window = activityData.filter(item => item.date >= startDate && item.date <= endDate && item.distance != null);
    const windowDates = window.map((item) => item.date);
    const windowDistances = window.map((item) => item.distance).map(kmToMi);

    results.push({
      startDate: windowDates[0],
      endDate: windowDates[windowDates.length - 1],
      totalDistance: windowDistances.reduce((sum, distance) => sum + distance, 0),
    }); 
  } 

  return results;
}

function generateCSV(slidingWindowStats, filename = 'activity_summary.csv') {
  const header = 'StartDate,EndDate,TotalDistance\n';
  const rows = slidingWindowStats.map(item => {
    return `${item.startDate.toISOString().split('T')[0]},${item.endDate.toISOString().split('T')[0]},${item.totalDistance}`;
  }).join('\n');

  fs.writeFileSync(filename, header + rows);
  console.log(`CSV data written to ${filename}`);
}

async function main() {
  const directory = 'activities';
  const activityData = await processActivities(directory);
  const stats = calculateSlidingWindowStats(activityData);

  console.log(JSON.stringify(stats, null, 2));
  generateCSV(stats);
}

main();
