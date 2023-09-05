let problems, solved, streakCount;

const getUserProfile = async () => {
  const username = window.location.href.split("/")[4];
  const url = `https://codeforces.com/api/user.info?handles=${username}`;
  return await fetch(url)
    .then((response) => response.json())
    .then((data) => {
      return data.result[0];
    });
};

const getProblems = async () => {
  let problems = null;

  // check if problems are cached
  const promise = new Promise((resolve, reject) => {
    chrome.storage.local.get(["problems"], (result) => {
      if (result["problems"]) {
        problems = JSON.parse(result["problems"]);
        resolve(problems);
      } else {
        resolve(null);
      }
    });
  });
  problems = await promise;
  if (problems) {
    console.log("problems fetched from cache");
    return problems;
  }
  const url = "https://codeforces.com/api/problemset.problems";
  const response = await fetch(url);
  const data = await response.json();
  problems = data.result.problems.filter((problem) => problem.rating);
  return problems;
};

const getProblemsForToday = async () => {
  const date = new Date().toISOString().split("T")[0];

  // check if problems for today's date are cached
  let problemsForToday = null;
  const promise = new Promise((resolve, reject) => {
    chrome.storage.local.get([date], (result) => {
      if (result[date]) {
        problemsForToday = JSON.parse(result[date]);
        resolve(problemsForToday);
      } else {
        resolve(null);
      }
    });
  });
  problemsForToday = await promise;
  if (problemsForToday) {
    console.log("problems for today fetched from cache");
    return problemsForToday;
  }

  console.log("problems for today not in cache");
  let problems = await fetch(
    chrome.runtime.getURL("assets/problems.json")
  ).then((response) => response.json());
  const level1 = problems.level1[date];
  const level2 = problems.level2[date];
  const level3 = problems.level3[date];

  return getProblems().then((problems) => {
    const contestIds = [level1, level2, level3].map(
      (problem) => problem.split("/")[0]
    );
    const indices = [level1, level2, level3].map(
      (problem) => problem.split("/")[1]
    );
    const problemsForToday = {
      level1: {},
      level2: {},
      level3: {},
    };
    problems.forEach(async (problem) => {
      if (contestIds[0] == problem.contestId && indices[0] == problem.index) {
        problemsForToday.level1 = problem;
      } else if (
        contestIds[1] == problem.contestId &&
        indices[1] == problem.index
      ) {
        problemsForToday.level2 = problem;
      } else if (
        contestIds[2] == problem.contestId &&
        indices[2] == problem.index
      ) {
        problemsForToday.level3 = problem;
      }
    });

    // cache problems for today's date
    console.log("caching problems for today");
    chrome.storage.local
      .set({
        [date]: JSON.stringify(problemsForToday),
      })
      .then(() => {
        console.log("problems for today cached");
      });
    return problemsForToday;
  });
};

const getUserSubmissionsToday = async () => {
  const username = window.location.href.split("/")[4];
  const url = `https://codeforces.com/api/user.status?handle=${username}&from=1&count=100`;
  return await fetch(url)
    .then((response) => response.json())
    .then((data) => {
      const submissions = data.result.filter((submission) => {
        const date = new Date(submission.creationTimeSeconds * 1000)
          .toISOString()
          .split("T")[0];
        const today = new Date().toISOString().split("T")[0];
        return date === today;
      });
      return submissions;
    });
};

const getProblemsData = async () => {
  const problems = await getProblemsForToday();
  const solvedToday = await getUserSubmissionsToday();
  solved = {
    level1: false,
    level2: false,
    level3: false,
  };
  solvedToday.forEach((submission) => {
    if (
      submission.problem.contestId == problems.level1.contestId &&
      submission.problem.index == problems.level1.index &&
      submission.verdict === "OK"
    ) {
      solved.level1 = true;
    } else if (
      submission.problem.contestId == problems.level2.contestId &&
      submission.problem.index == problems.level2.index &&
      submission.verdict === "OK"
    ) {
      solved.level2 = true;
    } else if (
      submission.problem.contestId == problems.level3.contestId &&
      submission.problem.index == problems.level3.index &&
      submission.verdict === "OK"
    ) {
      solved.level3 = true;
    }
  });
  return {
    problems,
    solved,
  };
};

const countStreak = async () => {
  let streakCount = 0;
  let problems = await fetch(
    chrome.runtime.getURL("assets/problems.json")
  ).then((response) => response.json());
  const username = window.location.href.split("/")[4];
  const submissionsURL = `https://codeforces.com/api/user.status?handle=${username}`;
  const submissions = await fetch(submissionsURL)
    .then((response) => response.json())
    .then((data) => {
      return data.result;
    });
  let today = new Date().toISOString().split("T")[0];
  today = new Date(new Date(today).getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  let maxIterations = 3000;
  while (maxIterations-- > 0) {
    let solved = false;
    const level1 = problems.level1[today];
    const level2 = problems.level2[today];
    const level3 = problems.level3[today];
    if (!level1 || !level2 || !level3) {
      break;
    }
    submissions.forEach((submission) => {
      if (
        submission.problem.contestId == level1.split("/")[0] &&
        submission.problem.index == level1.split("/")[1] &&
        submission.verdict === "OK" &&
        submission.creationTimeSeconds * 1000 <= new Date().getTime()
      ) {
        solved = true;
      } else if (
        submission.problem.contestId == level2.split("/")[0] &&
        submission.problem.index == level2.split("/")[1] &&
        submission.verdict === "OK" &&
        submission.creationTimeSeconds * 1000 <= new Date().getTime()
      ) {
        solved = true;
      } else if (
        submission.problem.contestId == level3.split("/")[0] &&
        submission.problem.index == level3.split("/")[1] &&
        submission.verdict === "OK" &&
        submission.creationTimeSeconds * 1000 <= new Date().getTime()
      ) {
        solved = true;
      }
    });
    if (solved) {
      streakCount++;
    } else {
      break;
    }
    today = new Date(new Date(today).getTime() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
  }
  return streakCount;
};

let loading = false;

const createProblemTable = (problems, solved) => {
  const table = document.createElement("table");
  table.classList.add("problems");
  table.id = "potd-table";
  table.style.width = "100%";
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  const headers = ["Level", "Problem", "Name", "Solved"];
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.innerText = header;
    thead.appendChild(th);
  });

  const levels = ["level1", "level2", "level3"];
  levels.forEach((level) => {
    const tr = document.createElement("tr");
    const td1 = document.createElement("td");
    td1.innerText =
      level[level.length - 1] === "1"
        ? "Easy"
        : level[level.length - 1] === "2"
        ? "Medium"
        : "Hard";
    const td2 = document.createElement("td");
    const a = document.createElement("a");
    a.href = `https://codeforces.com/problemset/problem/${problems[level].contestId}/${problems[level].index}`;
    a.innerText = `${problems[level].contestId}${problems[level].index}`;
    td2.appendChild(a);
    const td3 = document.createElement("td");
    td3.innerText = problems[level].name;
    const td4 = document.createElement("td");
    if (solved[level]) {
      const img = document.createElement("img");
      img.src = chrome.runtime.getURL("assets/tick.webp");
      img.style.width = "20px";
      img.style.height = "20px";
      td4.appendChild(img);
    } else {
      td4.innerText = "-";
    }
    tr.appendChild(td1);
    tr.appendChild(td2);
    tr.appendChild(td3);
    tr.appendChild(td4);
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);

  return table;
};

const addProblemsToProfile = async () => {
  // get the div roundbox which directly contains the div with userbox class
  const userbox = document.querySelector(".roundbox > .userbox");
  const roundbox = userbox.parentElement;
  const div = document.createElement("div");
  div.classList.add("roundbox", "borderTopRound", "borderBottomRound");
  div.style.marginTop = "10px";
  div.style.padding = "1em";
  const heading = document.createElement("h4");
  heading.id = "potd-heading";
  heading.innerText = "Problems of the day";
  heading.style.marginBottom = "1em";
  div.appendChild(heading);
  // create a loading gif
  const loading = document.createElement("div");
  loading.style.display = "flex";
  loading.style.justifyContent = "center";
  loading.style.alignItems = "center";
  loading.style.marginBottom = "1em";
  const img = document.createElement("img");
  img.src = chrome.runtime.getURL("assets/loading.gif");
  img.style.width = "30px";
  img.style.height = "30px";
  loading.appendChild(img);
  div.appendChild(loading);
  // insert the div after the roundbox div
  roundbox.parentElement.insertBefore(div, roundbox.nextSibling);

  getProblemsData().then((data) => {
    const table = createProblemTable(data.problems, data.solved);
    div.appendChild(table);
    loading.style.display = "none";
  });

  countStreak().then((streakCount) => {
    const streak = document.createElement("span");
    streak.innerText = `${streakCount}`;
    streak.style.marginBottom = "1em";
    const tick = document.createElement("img");
    tick.src = chrome.runtime.getURL("assets/tick.webp");
    tick.style.width = "16px";
    tick.style.height = "16px";
    streak.appendChild(tick);
    heading.appendChild(streak);
  });
};

const addPOTDBannerToProfile = async () => {
  const userbox = document.querySelector(".roundbox > .userbox");
  const roundbox = userbox.parentElement;
  const div = document.createElement("div");
  div.classList.add("roundbox", "borderTopRound", "borderBottomRound");
  div.style.marginBottom = "10px";
  div.style.padding = "1em";
  const heading = document.createElement("h4");
  heading.innerText = "Problem of the day";
  heading.style.marginBottom = "1em";
  div.appendChild(heading);

  await getProblemsData();
};

if (window.location.href.split("/")[3] === "profile") {
  getUserProfile().then((data) => {
    console.log(data);
  });
  getProblemsForToday().then((data) => {
    console.table(data);
  });
  getUserSubmissionsToday().then((data) => {
    console.table(data);
  });
  addProblemsToProfile();
}
