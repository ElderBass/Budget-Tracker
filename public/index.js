let transactions = [];
let myChart;

fetch("/api/transaction")
  .then((response) => {
    console.log("response in first fetch function ", response);
    return response.json();
  })
  .then((data) => {
    // save db data on global variable
    transactions = data;

    populateTotal();
    populateTable();
    populateChart();
  });

function populateTotal() {
  // reduce transaction amounts to a single total value
  let total = transactions.reduce((total, t) => {
    return total + parseInt(t.value);
  }, 0);

  let totalEl = document.querySelector("#total");
  totalEl.textContent = total;
}

function populateTable() {
  let tbody = document.querySelector("#tbody");
  tbody.innerHTML = "";

  transactions.forEach((transaction) => {
    // create and populate a table row
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${transaction.name}</td>
      <td>${transaction.value}</td>
    `;

    tbody.appendChild(tr);
  });
}

function populateChart() {
  // copy array and reverse it
  let reversed = transactions.slice().reverse();
  let sum = 0;

  // create date labels for chart
  let labels = reversed.map((t) => {
    let date = new Date(t.date);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  });

  // create incremental values for chart
  let data = reversed.map((t) => {
    sum += parseInt(t.value);
    return sum;
  });

  // remove old chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  let ctx = document.getElementById("myChart").getContext("2d");

  myChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Total Over Time",
          fill: true,
          backgroundColor: "#6666ff",
          data,
        },
      ],
    },
  });
}

function sendTransaction(isAdding) {
  let nameEl = document.querySelector("#t-name");
  let amountEl = document.querySelector("#t-amount");
  let errorEl = document.querySelector(".form .error");

  // validate form
  if (nameEl.value === "" || amountEl.value === "") {
    errorEl.textContent = "Missing Information";
    return;
  } else {
    errorEl.textContent = "";
  }

  // create record
  let transaction = {
    name: nameEl.value,
    value: amountEl.value,
    date: new Date().toISOString(),
    _id: Date.now(),
  };

  // if subtracting funds, convert amount to negative number
  if (!isAdding) {
    transaction.value *= -1;
  }

  // add to beginning of current array of data
  transactions.unshift(transaction);

  // re-run logic to populate ui with new record
  populateChart();
  populateTable();
  populateTotal();

  // also send to server
  fetch("/api/transaction", {
    method: "POST",
    body: JSON.stringify(transaction),
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      if (data.errors) {
        errorEl.textContent = "Missing Information";
      } else {
        // clear form
        nameEl.value = "";
        amountEl.value = "";
      }
    })
    .catch((err) => {
      // fetch failed, so save in indexed db
      saveRecord("put", transaction);


      // clear form
      nameEl.value = "";
      amountEl.value = "";
    });
}

document.querySelector("#add-btn").onclick = function () {
  sendTransaction(true);
};

document.querySelector("#sub-btn").onclick = function () {
  sendTransaction(false);
};

function checkForIndexedDb() {
  window.indexedDB =
    window.indexedDB ||
    window.mozIndexedDB ||
    window.webkitIndexedDB ||
    window.msIndexedDB;

  window.IDBTransaction =
    window.IDBTransaction ||
    window.webkitIDBTransaction ||
    window.msIDBTransaction;
  window.IDBKeyRange =
    window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

  if (!window.indexedDB) {
    console.log("Your browser doesn't support a stable version of IndexedDB.");
    return false;
  }
  return true;
}
//this function will save any transactions that occur offline into IndexedDB, then re-render the charts on screen with the passed-in data
function saveRecord(method, object) {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open("budget", 1);
    let db, tx, store;

    request.onupgradeneeded = function (e) {
      const db = request.result;
      db.createObjectStore("transactions", { keyPath: "_id" });
    };

    request.onerror = function (e) {
      console.log("There was an error");
    };

    request.onsuccess = function (e) {
      db = request.result;
      tx = db.transaction("transactions", "readwrite");
      store = tx.objectStore("transactions");

      db.onerror = function (e) {
        console.log("error");
      }; 
      if (method === "put") {
        
        store.put(object);

      populateTotal();
      populateTable();
      populateChart();
      }
      if (method === "get") {
        const all = store.getAll();
        all.onsuccess = function () {
          resolve(all.result);
        };
      }

      tx.oncomplete = function () {
        db.close();
      };
    };
  });
}
//on load, we'll want to check if we have any data in IndexedDb
//if we do, we'll retrieve it and push it to the fron of the global "transactions" array, then rerender the charts
function loadPage() {
  if (checkForIndexedDb()) {
    saveRecord("get").then((results) => {

      for (let i = 0; i < results.length; i++) {
        transactions.unshift(results[i]);
      }

      populateTotal();
      populateTable();
      populateChart();

      fetch("/api/transaction/bulk", {
        method: "POST",
        body: JSON.stringify(results),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
      }).then((data) => {
        //once we've succesfully transferred the data from IndexedDB into our Mongo DB, we can empty out the IndexedDB.
        clearIndexedDB();
      });
    });
  }
}

loadPage();

//this function empties the IndexedDB once we're done with it.
function clearIndexedDB() {
  var DBOpenRequest = window.indexedDB.open("budget", 1);

  DBOpenRequest.onsuccess = function (event) {
    db = DBOpenRequest.result;
    
  // open a read/write db transaction, ready for clearing the data
  var transaction = db.transaction("transactions", "readwrite");
  var objStore = transaction.objectStore("transactions");

  // Make a request to clear all the data out of the object store
  var objectStoreRequest = objStore.clear();

  objectStoreRequest.onsuccess = function (event) {
    // report the success of our request
    console.log("IndexedDB successfully cleared.");
  };
  };

}
