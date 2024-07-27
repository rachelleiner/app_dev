const express = require('express');
const mongoose = require('mongoose');
const Poll = require('../models/Poll');
const Movie = require('../models/Movie');
const { _router } = require('../server');
const router = express.Router();

const MongoClient = require('mongodb').MongoClient;
const url =
  'mongodb+srv://lyrenee02:tSGwv9viMBFajw3u@cluster.muwwbsd.mongodb.net/party-database?retryWrites=true&w=majority&appName=cluster';
const client = new MongoClient(url);

// Vote Page using query parameter
// Example: http://localhost:5000/api/poll/votePage?pollID=66980dc3b03ee5fdec99ffde
router.get('/votePage', async (req, res) => {
  const { pollID } = req.query;
  console.log(`Fetching vote page for pollID: ${pollID}`);

  try {
    const pollObjectId = new mongoose.Types.ObjectId(pollID);

    const poll = await Poll.findById(pollObjectId);
    if (!poll) {
      console.log('Poll not found');
      return res.status(404).json({ error: 'Poll not found' });
    }

    console.log('Poll found:', poll);
    console.log('Movies:', poll.movies);

    const moviesWithDetails = await Promise.all(
      poll.movies.map(async (movieEntry) => {
        const movie = await Movie.findOne({ movieID: movieEntry.movieID });
        if (!movie) {
          console.log('Movie not found for movieID:', movieEntry.movieID);
          return null;
        }

        const { votes, watchedStatus } = movieEntry;
        return {
          movieName: movie.title,
          votes,
          watchedStatus,
          genre: movie.genre,
          description: movie.description,
        };
      })
    );

    const validMovies = moviesWithDetails.filter((movie) => movie !== null);

    res.status(200).json({ movies: validMovies });
  } catch (err) {
    console.error('Error fetching vote page:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add movie to Poll
// Example: {
//     "partyID": "66980dc3b03ee5fdec99ffdc",
//     "movieID": 3
// }
router.post('/addMovieToPoll', async (req, res) => {
  const { partyID, movieTitle } = req.body;
  console.log(`Adding movie to poll for partyID: ${partyID}, movieTitle: ${movieTitle}`);

  try {
    if (!movieTitle || typeof movieTitle !== 'string') {
      console.log('Invalid movie title:', movieTitle);
      return res.status(400).json({ error: 'Invalid movie title' });
    }

    // Find movie by title
    const movie = await Movie.findOne({ title: movieTitle });
    if (!movie) {
      console.log('Movie not found for title:', movieTitle);
      return res.status(404).json({ error: 'Movie not found' });
    }

    const movieID = movie.movieID;  // Get movie ID from the movie document

    const poll = await Poll.findOne({ partyID });
    if (!poll) {
      console.log('Poll not found for partyID:', partyID);
      return res.status(404).json({ error: 'Poll not found for this party' });
    }

    // Check if movie is already in the poll
    const movieExists = poll.movies.some((m) => m.movieID === movieID);
    if (movieExists) {
      console.log('Movie already in poll:', movieID);
      return res.status(400).json({ error: 'Movie already in poll' });
    }

    // Add movie to the poll
    poll.movies.push({ movieID: movieID, votes: 0, watchedStatus: false });
    await poll.save();

    res.status(201).json({ message: 'Movie added to poll successfully', poll });
  } catch (e) {
    console.error('Error adding movie to poll:', e);
    res.status(500).json({ error: e.toString() });
  }
});

// Upvote movie
// Example: {
//     "partyID": "66980dc3b03ee5fdec99ffdc",
//     "movieID": 3
// }
// Upvote movie endpoint
const { ObjectId } = require('mongodb'); // Ensure ObjectId is imported

router.post('/upvoteMovie', async (req, res) => {
  const db = client.db('party-database');
  const { partyID, movieTitle } = req.body;

  if (!partyID || !movieTitle) {
    return res.status(400).json({ error: 'partyID and movieTitle are required' });
  }

  try {
    // Find movie by title
    const movie = await Movie.findOne({ title: movieTitle });
    if (!movie) {
      console.log('Movie not found for title:', movieTitle);
      return res.status(404).json({ error: 'Movie not found' });
    }

    const movieID = movie.movieID; // Get movie ID from the movie document
    const partyObjectId = new mongoose.Types.ObjectId(partyID);

    // Find the poll
    const poll = await Poll.findOne({ partyID: partyObjectId });
    console.log('Fetched Poll:', poll);

    if (!poll) {
      console.log('Poll not found for partyID:', partyID);
      return res.status(404).json({ error: 'Poll not found' });
    }

    console.log('Movies in Poll:', poll.movies.map(m => m.movieID));

    // Find movie entry in poll
    const movieEntry = poll.movies.find(m => m.movieID === movieID);
    if (!movieEntry) {
      console.log(`Movie not found in poll. movieID: ${movieID}`);
      return res.status(404).json({ error: 'Movie not found in poll' });
    }

    // Increment the vote count
    movieEntry.votes += 1;

    // Update the poll in the database
    const result = await Poll.updateOne(
      { _id: poll._id },
      { $set: { movies: poll.movies } }
    );

    if (result.matchedCount === 0) {
      console.log('Poll update failed');
      return res.status(500).json({ error: 'Poll update failed' });
    }

    return res.json({ votes: movieEntry.votes });
  } catch (error) {
    console.error('Error upvoting movie:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove movie from poll
// Example: {
//     "partyID": "66980dc3b03ee5fdec99ffdc",
//     "movieID": 3
// }
router.delete('/removeMovie', async (req, res) => {
  const { partyID, movieID } = req.body;
  console.log(
    `Removing movie from poll for partyID: ${partyID}, movieID: ${movieID}`
  );

  try {
    const partyObjectId = new mongoose.Types.ObjectId(partyID);

    const poll = await Poll.findOne({ partyID: partyObjectId });
    if (!poll) {
      console.log('Poll not found for partyID:', partyID);
      return res.status(404).json({ error: 'Poll not found for this party' });
    }

    const movieIndex = poll.movies.findIndex(
      (movie) => movie.movieID === movieID
    );
    if (movieIndex === -1) {
      console.log('Movie not found in poll:', movieID);
      return res.status(404).json({ error: 'Movie not found in poll' });
    }

    poll.movies.splice(movieIndex, 1);
    await poll.save();

    res.status(200).json({ message: 'Movie removed from poll successfully' });
  } catch (err) {
    console.error('Error removing movie from poll:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Mark movie as watched
// Example: {
//     "partyID": "66980dc3b03ee5fdec99ffdc",
//     "movieID": 3
// }
router.post('/markWatched', async (req, res) => {
  const { partyID, movieTitle } = req.body;

  try {
    // Find movie by title
    const movie = await Movie.findOne({ title: movieTitle });
    if (!movie) {
      console.log('Movie not found for title:', movieTitle);
      return res.status(404).json({ error: 'Movie not found' });
    }

    const movieID = movie.movieID; // Get movie ID from the movie document
    const partyObjectId = new mongoose.Types.ObjectId(partyID);

    const poll = await Poll.findOne({ partyID: partyObjectId });
    if (!poll) {
      console.log('Poll not found for partyID:', partyID);
      return res.status(404).json({ error: 'Poll not found' });
    }

    const movieEntry = poll.movies.find((movie) => movie.movieID === movieID);
    if (!movieEntry) {
      console.log('Movie not found in poll:', movieID);
      return res.status(404).json({ error: 'Movie not found in poll' });
    }

    movieEntry.watchedStatus = true;
    await poll.save();

    res.status(200).json({ message: 'Movie marked as watched successfully' });
  } catch (err) {
    console.error('Error marking movie as watched:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Start poll
router.post('/startPoll', async (req, res) => {
  const { partyID, movieID } = req.body;
  console.log(`Starting poll for partyID: ${partyID}, movieID: ${movieID}`);

  try {
    const newPoll = new Poll({ partyID, movieID });
    await newPoll.save();
    res.status(201).json({
      pollID: newPoll._id,
      partyID,
      message: 'Poll started successfully',
    });
  } catch (e) {
    console.error('Error starting poll:', e);
    res.status(500).json({ error: e.toString() });
  }
});

module.exports = router;
