// tests/notesController.unit.test.js
const httpMocks = require('node-mocks-http');
jest.mock('../models/Note');
jest.mock('../models/User');

const Note = require('../models/Note');
const User = require('../models/User');
const notesController = require('../controllers/notesController');

describe('notesController (unit)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  function makeRes() {
    const res = httpMocks.createResponse({ eventEmitter: require('events').EventEmitter });
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  test('getAllNotes: no notes returns 400', async () => {
    Note.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

    const req = httpMocks.createRequest();
    const res = makeRes();

    await notesController.getAllNotes(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'No notes found' });
  });

  test('getAllNotes: returns notes with usernames', async () => {
    const notes = [{ _id: '1', user: 'u1', title: 'n1' }];
    Note.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(notes) });

    const user = { username: 'user1' };
    User.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(user) }),
    });

    const req = httpMocks.createRequest();
    const res = makeRes();

    await notesController.getAllNotes(req, res);

    expect(res.json).toHaveBeenCalledWith([{ ...notes[0], username: 'user1' }]);
  });

  test('createNewNote: missing fields returns 400', async () => {
    const req = httpMocks.createRequest({ body: {} });
    const res = makeRes();

    await notesController.createNewNote(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'All fields are required' });
  });

  test('createNewNote: duplicate title returns 409', async () => {
    Note.findOne.mockReturnValue({
      collation: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ title: 'exists' }),
        }),
      }),
    });

    const req = httpMocks.createRequest({ body: { user: 'u', title: 'exists', text: 't' } });
    const res = makeRes();

    await notesController.createNewNote(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'Duplicate note title' });
  });

  test('createNewNote: success returns 201', async () => {
    Note.findOne.mockReturnValue({
      collation: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      }),
    });

    Note.create.mockResolvedValue({ _id: 'new' });

    const req = httpMocks.createRequest({ body: { user: 'u', title: 'new', text: 't' } });
    const res = makeRes();

    await notesController.createNewNote(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'New note created' });
  });

  test('updateNote: missing fields returns 400', async () => {
    const req = httpMocks.createRequest({ body: { id: '1' } });
    const res = makeRes();

    await notesController.updateNote(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'All fields are required' });
  });

  test('updateNote: note not found returns 400', async () => {
    Note.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    const req = httpMocks.createRequest({
      body: { id: '1', user: 'u', title: 't', text: 'txt', completed: false },
    });
    const res = makeRes();

    await notesController.updateNote(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Note not found' });
  });

  test('updateNote: duplicate title returns 409', async () => {
    const note = { save: jest.fn().mockResolvedValue({ title: 'updated' }) };
    Note.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(note) });

    const duplicate = { _id: '2', title: 'dup' };
    Note.findOne.mockReturnValue({
      collation: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(duplicate),
        }),
      }),
    });

    const req = httpMocks.createRequest({
      body: { id: '1', user: 'u', title: 'dup', text: 'txt', completed: false },
    });
    const res = makeRes();

    await notesController.updateNote(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'Duplicate note title' });
  });

  test('updateNote: success saves and returns message', async () => {
    const note = {
      user: 'u',
      title: 'old',
      text: 'txt',
      completed: false,
      save: jest.fn().mockResolvedValue({ title: 'updated' }),
    };
    Note.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(note) });

    Note.findOne.mockReturnValue({
      collation: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      }),
    });

    const req = httpMocks.createRequest({
      body: { id: '1', user: 'u', title: 'updated', text: 'new', completed: true },
    });
    const res = makeRes();

    await notesController.updateNote(req, res);

    expect(note.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(`'updated' updated`);
  });

  test('deleteNote: missing id returns 400', async () => {
    const req = httpMocks.createRequest({ body: {} });
    const res = makeRes();

    await notesController.deleteNote(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Note ID required' });
  });

  test('deleteNote: note not found returns 400', async () => {
    Note.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    const req = httpMocks.createRequest({ body: { id: '1' } });
    const res = makeRes();

    await notesController.deleteNote(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Note not found' });
  });

  test('deleteNote: success deletes and returns reply', async () => {
    const note = {
      title: 'toDelete',
      _id: '1',
      deleteOne: jest.fn().mockResolvedValue({ title: 'toDelete', _id: '1' }),
    };
    Note.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(note) });

    const req = httpMocks.createRequest({ body: { id: '1' } });
    const res = makeRes();

    await notesController.deleteNote(req, res);

    expect(note.deleteOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(`Note 'toDelete' with ID 1 deleted`);
  });
});
