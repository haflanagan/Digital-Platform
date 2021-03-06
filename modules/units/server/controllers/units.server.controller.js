'use strict';

/**
 * Module dependencies
 */
var path = require('path'),
  mongoose = require('mongoose'),
  Unit = mongoose.model('Unit'),
  UnitActivity = mongoose.model('UnitActivity'),
  Lesson = mongoose.model('Lesson'),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller')),
  _ = require('lodash');

var validateUnit = function(unit, successCallback, errorCallback) {
  var errorMessages = [];

  if (!unit.title) {
    errorMessages.push('Title is required');
  }
  if (!unit.color) {
    errorMessages.push('Color is required');
  }
  if (!unit.icon) {
    errorMessages.push('Icon is required');
  }

  if (!unit.stageOne || !unit.stageOne.enduringUnderstandings || !unit.stageOne.enduringUnderstandings.fieldWork) {
    errorMessages.push('Field work is required');
  }
  if (!unit.stageOne || !unit.stageOne.enduringUnderstandings || !unit.stageOne.enduringUnderstandings.scienceContent) {
    errorMessages.push('Science content is required');
  }

  if (errorMessages.length > 0) {
    errorCallback(errorMessages);
  } else {
    successCallback(unit);
  }
};

/**
 * Create an unit
 */
exports.create = function (req, res) {
  validateUnit(req.body,
  function(unitJSON) {
    var unit = new Unit(unitJSON);
    unit.user = req.user;
    unit.status = 'published';

    unit.validate(function (err) {
      if (err) {
        console.log(err);
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      } else {
        unit.save(function (err) {
          if (err) {
            return res.status(400).send({
              message: errorHandler.getErrorMessage(err)
            });
          } else {
            res.json(unit);
          }
        });
      }
    });
  }, function(errorMessages) {
    return res.status(400).send({
      message: errorMessages
    });
  });
};

/**
 * Show the current unit
 */
exports.read = function (req, res) {
  // convert mongoose document to JSON
  var unit = req.unit ? req.unit.toJSON() : {};

  unit.isCurrentUserOwner = req.user && unit.user && unit.user._id.toString() === req.user._id.toString() ? true : false;

  Lesson.find({ unit: unit }).exec(function(err, lessons) {
    console.log('lessons', lessons);
    unit.hasLessons = (lessons && lessons.length > 0) ? true : false;

    if (!unit.isCurrentUserOwner) {
      var activity = new UnitActivity({
        user: req.user,
        unit: unit,
        activity: 'viewed'
      });

      activity.save(function(err) {
        res.json(unit);
      });
    } else {
      res.json(unit);
    }
  });
};

/**
 * Incrementally save a unit
 */
exports.incrementalSave = function(req, res) {
  console.log('incrementalSave');
  var unit = req.unit;

  if (unit) {
    unit = _.extend(unit, req.body);
    if (!req.body.initial) unit.status = 'draft';
  } else {
    unit = new Unit(req.body);
    unit.user = req.user;
    unit.status = 'draft';
  }

  unit.save(function(err) {
    if (err) {
      console.log('save err', err);
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      validateUnit(unit,
      function(unitJSON) {
        res.json({
          unit: unit,
          successful: true
        });
      }, function(errorMessages) {
        res.json({
          unit: unit,
          errors: errorMessages
        });
      });
    }
  });
};

/**
 * Update an unit
 */
exports.update = function(req, res) {
  var unit = req.unit;
  validateUnit(req.body,
  function(unitJSON) {
    if (unit) {
      unit = _.extend(unit, unitJSON);
      if (!unit.updated) unit.updated = [];
      unit.updated.push(Date.now());
      unit.status = 'published';

      unit.save(function(err) {
        if (err) {
          return res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        } else {
          res.json(unit);
        }
      });
    } else {
      return res.status(400).send({
        message: 'Cannot update the unit'
      });
    }
  }, function(errorMessages) {
    return res.status(400).send({
      message: errorMessages
    });
  });
};

/**
 * Delete an unit
 */
exports.delete = function (req, res) {
  var unit = req.unit;

  unit.remove(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(unit);
    }
  });
};

/**
 * List of Units
 */
exports.list = function (req, res) {
  var query;

  if (req.query.published) {
    query = Unit.find({ status: 'published' });
  } else {
    query = Unit.find();
  }
  query.sort('title').populate('user', 'displayName').exec(function (err, units) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(units);
    }
  });
};

/**
 * List of lessons by units
 */
exports.listLessons = function(req, res) {
  var unit = req.unit;

  Lesson.find({ unit: unit }).sort('-created').
  populate('user', 'displayName email team profileImageURL').
  populate('unit', 'title color icon').exec(function(err, lessons) {
    if (err) {
      console.log(err);
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(lessons);
    }
  });
};


/**
 * Unit middleware
 */
exports.unitByID = function (req, res, next, id) {

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({
      message: 'Unit is invalid'
    });
  }

  Unit.findById(id).populate('user', 'firstName displayName email team profileImageURL')
  .exec(function (err, unit) {
    if (err) {
      return next(err);
    } else if (!unit && id !== '000000000000000000000000') {
      return res.status(404).send({
        message: 'No unit with that identifier has been found'
      });
    }
    req.unit = unit;
    next();
  });
};
