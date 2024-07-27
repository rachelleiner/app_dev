require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');


const app = express();

// MongoDB connection
const url = process.env.MONGO_URI_PARTY;

mongoose.set('strictQuery', true);

if (process.env.NODE_ENV !== 'test') {
  console.log('MongoDB URI:', url);
  mongoose
    .connect(url, {
      dbName: 'party-database',
    })
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.log(err));
}

// Mongoose Models
const User = require('./models/User');
const Party = require('./models/Party');
const Poll = require('./models/Poll');
const PartyGuest = require('./models/PartyMembers');
const Movie = require('./models/Movie');

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: url,
      dbName: 'party-database',
      collectionName: 'sessions',
    }),
    cookie: {
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  })
);

app.use(cors({
  origin: '*', // Allow all origins (be careful with this in production)
  methods: 'GET, POST, PUT, DELETE, OPTIONS',
  allowedHeaders: 'Content-Type, Authorization',
}));

// Routes
const authRouter = require('./routes/auth');
const partyRouter = require('./routes/party');
const pollRouter = require('./routes/poll');
const Invite = require('./models/Invite');

app.use('/api/auth', authRouter);
app.use('/api/party', partyRouter);
app.use('/api/poll', pollRouter);

app.get('/', (req, res) => {
  if (!req.session.views) {
    req.session.views = 0;
  }
  req.session.views++;
  res.send(`Number of views: ${req.session.views}`);
});

// Display movies
app.post('/api/displayMovies', async (req, res) => {
  const { partyID } = req.body;

  try {
    // Fetch polls for the given partyID
    const polls = await Poll.find({ partyID });

    // Collect watched movie IDs from the polls
    const watchedMovies = polls.flatMap(poll =>
      poll.movies
        .filter(movie => movie.watchedStatus) // Only include watched movies
        .map(movie => movie.movieID)
    );

    // Collect movie IDs from the polls
    const movieIDs = polls.flatMap(poll =>
      poll.movies.map(movie => movie.movieID)
    );

    // Filter out watched movies
    const moviesNotWatched = movieIDs.filter(movieID => !watchedMovies.includes(movieID));

    // Fetch movies based on the collected IDs
    const movies = await Movie.find({ movieID: { $in: moviesNotWatched } }).sort({ votes: -1 }).exec();

    console.log(movies);

    res.status(200).json(movies);
  } catch (e) {
    console.error('Server error:', e);
    res.status(500).json({ error: e.toString() });
  }
});


// Display watched movies
app.post('/api/displayWatchedMovies', async (req, res) => {
  const { partyID } = req.body;
  try {
    const polls = await Poll.find({ partyID });
    const watchedMovies = polls.flatMap((poll) =>
      poll.movies.filter(movie => movie.watchedStatus).map(movie => movie.movieID)
    );

    const movies = await Movie.find({ movieID: { $in: watchedMovies } });
    console.log('movies',)
    res.status(200).json(movies);
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

// Search movies
app.post('/api/searchMovie', async (req, res) => {
  const { search } = req.body;
  try {
    const movies = await Movie.find({ title: new RegExp(search, 'i') });
    res.status(200).json(movies.map((movie) => movie.title));
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

// Display user account
app.post('/api/userAccount', async (req, res) => {
  const { userID } = req.body;
  try {
    const user = await User.findById(userID);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user);
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

// Change password
app.post('/api/changePassword', async (req, res) => {
  const { userID, newPassword, validatePassword } = req.body;
  const passwordRegex =
    /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.*[A-Z])[a-zA-Z0-9!@#$%^&*]{8,32}$/;

  if (newPassword !== validatePassword) {
    return res.status(400).json({ error: 'Passwords must match' });
  }
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({ error: 'Weak password' });
  }

  try {
    const user = await User.findById(userID);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const isSamePassword = bcrypt.compareSync(newPassword, user.password);
    if (isSamePassword) {
      return res
        .status(400)
        .json({ error: 'Password matches current password' });
    }
    user.password = bcrypt.hashSync(newPassword, 8);
    await user.save();
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

// Send reset password email
app.post('/api/sendResetPassEmail', async (req, res) => {
  const { email } = req.body;
  try{
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email' });
    }
    const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: "themoviesocial@gmail.com",
        pass: "mjzd lbgy tttl ynuc"
    },
    });  
    const passToken = jwt.sign({ data: 'Pass Token' }, 'PassTokenKey', { expiresIn: '24h' });
    transporter
    .sendMail({
      from: '"largeproject " <themoviesocial@gmail.com>',
      to: email,
      subject: 'Password Reset Request',
      text: `Hi! There, You can reset your password 
            by clicking the link below:
            https://cod-destined-secondly.ngrok-free.app/api/resetPassword/${passToken}/${email}
            Thanks`,
    });
    res.status(200).json({ message: 'email sent' });
    }
    catch(e){
      res.status(500).json({ error: e.toString() });
    };
});

// Reset password verify and redirect
// RESET_PASSWORD_PAGE needed
// can probably use the changepassword page
app.get('/api/resetPassword/:passToken/:email', async (req, res) => {
  const { passToken, email} = req.params;
  try {
    // Verifying the JWT token 
    jwt.verify(passToken, 'PassTokenKey', function(err, decoded) {
      if (err) {
        return res.status(401).send(`
          <html>
            <body>
              <h2>Reset password failed</h2> 
              <p>The link you clicked is invalid or has expired. </p>
              <p><a href="https://cod-destined-secondly.ngrok-free.app/api/auth/verifyEmail/api/auth/login">Go to Login Page</a></p>
            </body>
          </html>
        `);
      }
      let url = new URL("https://cod-destined-secondly.ngrok-free.app/RESET_PASSWORD_PAGE?email="+email);
      res.status(200).send(`
        <html>
          <head>
            <title>Redirecting to another page</title>
            <!-- Redirecting to another page using meta tag -->
            <meta http-equiv="refresh" content="1; url = ${url} " />
          </head>
          <body>
            <h3>
              Redirecting to another page
            </h3>
            <p><strong>Note:</strong> If your browser supports Refresh, you'll be
              redirected to the Reset Password Page. 
            </p>
            <p>If you are not redirected in 5 seconds, click the link below:
              <a href = ${url}  target="_blank">click here</a>
            </p>
          </body>
          </html>`
      );
    });
  } catch (e) {
    console.error('Error during reset password:', e);
    res.status(500).send(`
      <html>
        <body>
          <h2>Internal Server Error</h2>
          <p>There was a problem processing your password reset. Please try again later.</p>
        </body>
      </html>
    `);
  }
});

// reset password with email
app.post('/api/resetPass', async (req, res) => {
  const { email, newPassword, validatePassword } = req.body;
  const passwordRegex =
    /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.*[A-Z])[a-zA-Z0-9!@#$%^&*]{8,32}$/;

  if (newPassword !== validatePassword) {
    return res.status(400).json({ error: 'Passwords must match' });
  }
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({ error: 'Weak password' });
  }

  try {
    //const user = await User.findById(userID);
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const isSamePassword = bcrypt.compareSync(newPassword, user.password);
    if (isSamePassword) {
      return res
        .status(400)
        .json({ error: 'Password matches current password' });
    }
    user.password = bcrypt.hashSync(newPassword, 8);
    await user.save();
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});


app.post('/api/invite', async (req, res) => {
  const { senderId, receiverId } = req.body;

  try {
    // Find the existing party for the sender
    const existingParty = await Party.findOne({ hostID: senderId });
    const senderObjectId = new mongoose.Types.ObjectId(senderId);

    // Check if the party exists
    if (!existingParty) {
      return res.status(404).json({ 
        error: 'Party not found', 
        senderId: senderId 
      });
    }

    const partyId = existingParty._id;

    if (!partyId) {
      return res.status(404).json({ error: 'Party ID not found' });
    }

    // Find the user by email
    const invitedUser = await User.findOne({ email: receiverId });

    // Check if the user exists
    if (!invitedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const invitedId = invitedUser._id;

    if (!invitedId) {
      return res.status(404).json({ error: 'User Id not found' });
    }

    console.log('Party ID:', partyId);
    console.log('Sender ID:', senderObjectId);
    console.log('Receiver ID:', invitedId);

    // Create a new invitation
    const invitation = new Invite({ partyId, senderObjectId, invitedId });
    await invitation.save();

    res.status(200).json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Error in /api/invite:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/api/invitations/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const invitations = await Invite.find({ receiverId: userId, status: 'pending' }).populate('partyId senderId');
    res.status(200).json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/invitations/respond', async (req, res) => {
  const { invitationId, status } = req.body;

  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const invitation = await Invite.findById(invitationId);
    invitation.status = status;
    await invitation.save();
    res.status(200).json({ message: `Invitation ${status}` });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
