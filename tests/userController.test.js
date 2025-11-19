// tests/userController.unit.test.js
const httpMocks = require('node-mocks-http');
jest.mock('../models/User');
jest.mock('../models/Note');
jest.mock('bcrypt');

const User = require('../models/User');
const Note = require('../models/Note');
const bcrypt = require('bcrypt');

const userController = require('../controllers/userController');

describe('userController (unit)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  function makeRes() {
    const res = httpMocks.createResponse({ eventEmitter: require('events').EventEmitter });
    // ensure status/json are spies
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  test('getAllUsers returns list', async () => {
    const fakeUsers = [{ username: 'u1' }, { username: 'u2' }];
    // mock chain: find().select("-password").lean()
    User.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(fakeUsers)
      })
    });

    const req = httpMocks.createRequest();
    const res = makeRes();

    await userController.getAllUsers(req, res);

    // controller uses res.json(users) (200 by default)
    expect(res.json).toHaveBeenCalledWith(fakeUsers);
  });

  test('createNewUser: missing fields returns 400', async () => {
    const req = httpMocks.createRequest({ body: {} });
    const res = makeRes();

    await userController.createNewUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
  });

  test('createNewUser: duplicate username returns 409', async () => {
    // Mock findOne().collation().lean().exec() chain to return a duplicate
    User.findOne.mockReturnValue({
      collation: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ username: 'existing' })
        })
      })
    });

    const req = httpMocks.createRequest({
      body: { username: 'existing', password: 'p' }
    });
    const res = makeRes();

    await userController.createNewUser(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
  });

  test('createNewUser: success returns 201', async () => {
    // No duplicate
    User.findOne.mockReturnValue({
      collation: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null)
        })
      })
    });
    bcrypt.hash.mockResolvedValue('hashedPwd');

    const createdUser = { username: 'newuser' };
    User.create.mockResolvedValue(createdUser);

    const req = httpMocks.createRequest({
      body: { username: 'newuser', password: 'p' }
    });
    const res = makeRes();

    await userController.createNewUser(req, res);

    expect(bcrypt.hash).toHaveBeenCalled();
    expect(User.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('New user') }));
  });

  test('updateUser: missing/invalid fields returns 400', async () => {
    const req = httpMocks.createRequest({ body: { id: '1' } }); // missing username, roles, active
    const res = makeRes();

    await userController.updateUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('updateUser: user not found returns 400', async () => {
    User.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    const req = httpMocks.createRequest({
      body: { id: '1', username: 'u', roles: ['Employee'], active: true }
    });
    const res = makeRes();

    await userController.updateUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
  });

  test('updateUser: duplicate username returns 409', async () => {
    const existing = { _id: '2', username: 'dup' };
    // findById returns user being updated
    const userObj = { _id: '1', username: 'orig', save: jest.fn().mockResolvedValue({ username: 'dup' }) };
    User.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(userObj) });

    // findOne returns a duplicate with a different _id
    User.findOne.mockReturnValue({
      collation: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(existing)
        })
      })
    });

    const req = httpMocks.createRequest({
      body: { id: '1', username: 'dup', roles: ['Employee'], active: true }
    });
    const res = makeRes();

    await userController.updateUser(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  test('updateUser: success saves and returns message', async () => {
    const userObj = {
      _id: '1',
      username: 'orig',
      roles: ['Employee'],
      active: true,
      colorMode: 'light',
      partsListView: 'list',
      save: jest.fn().mockResolvedValue({ username: 'updated' })
    };
    User.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(userObj) });

    // Duplicate check returns null
    User.findOne.mockReturnValue({
      collation: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null)
        })
      })
    });

    const req = httpMocks.createRequest({
      body: {
        id: '1',
        username: 'updated',
        roles: ['Admin'],
        active: false,
        colorMode: 'dark',
        partsListView: 'grid'
      }
    });
    const res = makeRes();

    await userController.updateUser(req, res);

    expect(userObj.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('updated') }));
  });

  test('deleteUser: missing id returns 400', async () => {
    const req = httpMocks.createRequest({ body: {} });
    const res = makeRes();

    await userController.deleteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
  });

  test('deleteUser: assigned notes returns 400', async () => {
    // mock Note.findOne().lean().exec returns a note
    Note.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ title: 'note1' })
      })
    });

    const req = httpMocks.createRequest({ body: { id: '1' } });
    const res = makeRes();

    await userController.deleteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
  });

  test('deleteUser: user not found returns 400', async () => {
    // No assigned notes
    Note.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      })
    });
    // User not found
    User.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    const req = httpMocks.createRequest({ body: { id: '1' } });
    const res = makeRes();

    await userController.deleteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('deleteUser: success returns reply', async () => {
    // No assigned notes
    Note.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      })
    });

    // User found and deleteOne returns result with username/_id
    const userObj = {
      deleteOne: jest.fn().mockResolvedValue({ username: 'gone', _id: '1' })
    };
    User.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(userObj) });

    const req = httpMocks.createRequest({ body: { id: '1' } });
    const res = makeRes();

    await userController.deleteUser(req, res);

    expect(userObj.deleteOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.stringContaining('Username gone'));
  });
});