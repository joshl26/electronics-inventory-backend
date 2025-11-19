// tests/partsController.unit.test.js
const httpMocks = require('node-mocks-http');
jest.mock('../models/Part');
jest.mock('../models/User');
jest.mock('cloudinary').v2;

const Part = require('../models/Part');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;
const partsController = require('../controllers/partsController');

describe('partsController (unit)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  function makeRes() {
    const res = httpMocks.createResponse({ eventEmitter: require('events').EventEmitter });
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  test('getAllParts: no parts returns 400', async () => {
    Part.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

    const req = httpMocks.createRequest();
    const res = makeRes();

    await partsController.getAllParts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'No parts found' });
  });

  test('getAllParts: returns parts with usernames', async () => {
    const parts = [{ _id: '1', user: 'u1', name: 'p1' }];
    Part.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(parts) });

    const user = { username: 'user1' };
    User.findById.mockReturnValue({
      lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(user) }),
    });

    const req = httpMocks.createRequest();
    const res = makeRes();

    await partsController.getAllParts(req, res);

    expect(res.json).toHaveBeenCalledWith([{ ...parts[0], username: 'user1' }]);
  });

  test('createNewPart: missing fields returns 400', async () => {
    const req = httpMocks.createRequest({ body: {} });
    const res = makeRes();

    await partsController.createNewPart(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'All fields are required' });
  });

  test('createNewPart: duplicate name returns 409', async () => {
    Part.findOne.mockReturnValue({
      collation: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ name: 'exists' }),
        }),
      }),
    });

    const req = httpMocks.createRequest({ body: { user: 'u', name: 'exists', description: 'd' } });
    const res = makeRes();

    await partsController.createNewPart(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'Duplicate part name' });
  });

  test('createNewPart: success returns 201', async () => {
    Part.findOne.mockReturnValue({
      collation: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      }),
    });

    Part.create.mockResolvedValue({ _id: 'new' });

    const req = httpMocks.createRequest({
      body: { user: 'u', name: 'new', description: 'd' },
    });
    const res = makeRes();

    await partsController.createNewPart(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'New part created' });
  });

  test('updatePart: missing fields returns 400', async () => {
    const req = httpMocks.createRequest({ body: { id: '1' } });
    const res = makeRes();

    await partsController.updatePart(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'All fields are required' });
  });

  test('updatePart: part not found returns 400', async () => {
    Part.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    const req = httpMocks.createRequest({
      body: { id: '1', user: 'u', name: 'p', description: 'd' },
    });
    const res = makeRes();

    await partsController.updatePart(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Part not found' });
  });

  test('updatePart: duplicate name returns 409', async () => {
    const part = { save: jest.fn().mockResolvedValue({ name: 'updated' }) };
    Part.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(part) });

    const duplicate = { _id: '2', name: 'dup' };
    Part.findOne.mockReturnValue({
      collation: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(duplicate),
        }),
      }),
    });

    const req = httpMocks.createRequest({
      body: { id: '1', user: 'u', name: 'dup', description: 'd' },
    });
    const res = makeRes();

    await partsController.updatePart(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'Duplicate part name' });
  });

  test('updatePart: success saves and returns message', async () => {
    const part = {
      user: 'u',
      name: 'old',
      description: 'd',
      save: jest.fn().mockResolvedValue({ name: 'updated' }),
    };
    Part.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(part) });

    Part.findOne.mockReturnValue({
      collation: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      }),
    });

    const req = httpMocks.createRequest({
      body: { id: '1', user: 'u', name: 'updated', description: 'new' },
    });
    const res = makeRes();

    await partsController.updatePart(req, res);

    expect(part.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(`'updated' updated`);
  });

  test('updatePart: deletes images from cloudinary if deletedImages provided', async () => {
    const part = {
      user: 'u',
      name: 'old',
      description: 'd',
      deletedImages: [],
      save: jest.fn().mockResolvedValue({ name: 'updated' }),
    };
    Part.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(part) });

    Part.findOne.mockReturnValue({
      collation: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      }),
    });

    cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

    const req = httpMocks.createRequest({
      body: {
        id: '1',
        user: 'u',
        name: 'updated',
        description: 'new',
        deletedImages: [{ fileName: 'img1' }],
      },
    });
    const res = makeRes();

    await partsController.updatePart(req, res);

    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('img1');
    expect(part.save).toHaveBeenCalled();
  });

  test('deletePart: missing id returns 400', async () => {
    const req = httpMocks.createRequest({ body: {} });
    const res = makeRes();

    await partsController.deletePart(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Part ID required' });
  });

  test('deletePart: part not found returns 400', async () => {
    Part.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    const req = httpMocks.createRequest({ body: { id: '1' } });
    const res = makeRes();

    await partsController.deletePart(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Part not found' });
  });

  test('deletePart: success deletes and returns reply', async () => {
    const part = {
      name: 'toDelete',
      _id: '1',
      deleteOne: jest.fn().mockResolvedValue({ name: 'toDelete', _id: '1' }),
    };
    Part.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(part) });

    const req = httpMocks.createRequest({ body: { id: '1' } });
    const res = makeRes();

    await partsController.deletePart(req, res);

    expect(part.deleteOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(`Part 'toDelete' with ID 1 deleted`);
  });
});
