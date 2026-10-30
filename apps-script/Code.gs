/**
 * PingPongTracker - LogIt backend (bound to Ping_Pong_Database sheet).
 */

var MATCHES_SHEET = 'Matches';
var PLAYERS_SHEET = 'Players';
var ALLOWED_SIDES = ['Fridge', 'Outdent'];
var REQUIRE_SIDE = true;
var PASSCODE = '';
var MAX_WINNER_SCORE = 30;

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var players = readPlayers_(ss);
    var matches = readMatches_(ss);
    return jsonOutput_({ ok: true, players: players, matches: matches, sides: ALLOWED_SIDES });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOutput_({ ok: false, error: 'Missing request body' });
    }

    var payload = JSON.parse(e.postData.contents);

    if (PASSCODE && payload.passcode !== PASSCODE) {
      return jsonOutput_({ ok: false, error: 'Invalid passcode' });
    }

    if (payload.action === 'deleteLatest') {
      var ssDelete = SpreadsheetApp.getActiveSpreadsheet();
      var deleteLock = LockService.getScriptLock();
      deleteLock.waitLock(10000);
      try {
        deleteLatestMatch_(ssDelete);
      } finally {
        deleteLock.releaseLock();
      }
      return jsonOutput_({ ok: true });
    }

    var winner = normalizeName_(payload.winner);
    var loser = normalizeName_(payload.loser);
    var winnerScore = Number(payload.winnerScore);
    var loserScore = Number(payload.loserScore);
    var winnerSide = payload.winnerSide != null ? String(payload.winnerSide).trim() : '';

    if (!winner || !loser) {
      return jsonOutput_({ ok: false, error: 'Winner and loser are required' });
    }
    if (winner.toLowerCase() === loser.toLowerCase()) {
      return jsonOutput_({ ok: false, error: 'Winner and loser must be different' });
    }

    var nameError = validatePlayerName_(winner);
    if (nameError) return jsonOutput_({ ok: false, error: 'Winner: ' + nameError });
    nameError = validatePlayerName_(loser);
    if (nameError) return jsonOutput_({ ok: false, error: 'Loser: ' + nameError });

    var scoreError = validateScores_(winnerScore, loserScore);
    if (scoreError) return jsonOutput_({ ok: false, error: scoreError });

    var sideError = validateSide_(winnerSide);
    if (sideError) return jsonOutput_({ ok: false, error: sideError });

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var existing = readPlayers_(ss);
      var existingLower = existing.map(function (n) {
        return n.toLowerCase();
      });

      if (existingLower.indexOf(winner.toLowerCase()) === -1) {
        appendPlayer_(ss, winner);
      }
      if (existingLower.indexOf(loser.toLowerCase()) === -1) {
        appendPlayer_(ss, loser);
      }

      var matchesSheet = ss.getSheetByName(MATCHES_SHEET);
      if (!matchesSheet) {
        throw new Error('Sheet not found: ' + MATCHES_SHEET);
      }
      matchesSheet.appendRow([new Date(), winner, loser, winnerScore, loserScore, winnerSide]);
    } finally {
      lock.releaseLock();
    }

    return jsonOutput_({ ok: true });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err.message || err) });
  }
}

function readPlayers_(ss) {
  var sheet = ss.getSheetByName(PLAYERS_SHEET);
  if (!sheet) throw new Error('Sheet not found: ' + PLAYERS_SHEET);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow, 1).getValues();
  var names = [];
  for (var i = 0; i < values.length; i++) {
    var name = String(values[i][0] || '').trim();
    if (name) names.push(name);
  }
  return names;
}

function readMatches_(ss) {
  var sheet = ss.getSheetByName(MATCHES_SHEET);
  if (!sheet) throw new Error('Sheet not found: ' + MATCHES_SHEET);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow, 6).getValues();
  var matches = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    if (isEmptyRow_(row)) continue;
    var ts = row[0];
    var iso =
      ts instanceof Date && !isNaN(ts.getTime()) ? ts.toISOString() : String(ts || '');
    matches.push({
      timestamp: iso,
      winner: String(row[1] || '').trim(),
      loser: String(row[2] || '').trim(),
      winnerScore: Number(row[3]),
      loserScore: Number(row[4]),
      winnerSide: String(row[5] || '').trim(),
    });
  }
  return matches;
}

function deleteLatestMatch_(ss) {
  var sheet = ss.getSheetByName(MATCHES_SHEET);
  if (!sheet) throw new Error('Sheet not found: ' + MATCHES_SHEET);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('No games to delete');
  var numRows = lastRow - 1;
  var values = sheet.getRange(2, 1, numRows, 6).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    if (!isEmptyRow_(values[i])) {
      sheet.deleteRow(i + 2);
      return;
    }
  }
  throw new Error('No games to delete');
}

function appendPlayer_(ss, name) {
  var sheet = ss.getSheetByName(PLAYERS_SHEET);
  if (!sheet) throw new Error('Sheet not found: ' + PLAYERS_SHEET);
  sheet.appendRow([name]);
}

function normalizeName_(value) {
  return String(value || '').trim();
}

function validatePlayerName_(name) {
  if (!name) return 'Name is required';
  if (name.length > 40) return 'Name must be 40 characters or fewer';
  return null;
}

/**
 * Play to 11, win by 2: winner 11–30; if winner is 11, loser 0–9; else loser = winner - 2.
 */
function validateScores_(winnerScore, loserScore) {
  if (!Number.isInteger(winnerScore) || !Number.isInteger(loserScore)) {
    return 'Scores must be whole numbers';
  }
  if (winnerScore < 11 || winnerScore > MAX_WINNER_SCORE) {
    return 'Winner score must be between 11 and ' + MAX_WINNER_SCORE;
  }
  if (loserScore < 0) {
    return 'Loser score cannot be negative';
  }
  if (winnerScore <= loserScore) {
    return 'Winner score must be higher than loser score';
  }
  if (winnerScore === 11) {
    if (loserScore > 9) {
      return 'At 11, loser score must be 9 or less (win by 2)';
    }
    return null;
  }
  if (loserScore !== winnerScore - 2) {
    return 'Scores must reflect win by 2 (e.g. 12–10, 15–13)';
  }
  return null;
}

function validateSide_(winnerSide) {
  if (!REQUIRE_SIDE) {
    if (winnerSide === '') return null;
    if (ALLOWED_SIDES.indexOf(winnerSide) !== -1) return null;
    return 'Winner side must be one of: ' + ALLOWED_SIDES.join(', ');
  }
  if (ALLOWED_SIDES.indexOf(winnerSide) === -1) {
    return 'Winner side must be one of: ' + ALLOWED_SIDES.join(', ');
  }
  return null;
}

function isEmptyRow_(row) {
  for (var c = 0; c < row.length; c++) {
    if (String(row[c] || '').trim() !== '') return false;
  }
  return true;
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
