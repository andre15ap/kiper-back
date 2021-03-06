import * as Yup from 'yup';
import Dweller from '../models/Dweller';
import Apartment from '../models/Apartment';

import validateCpf from '../../utils/validateCpf';
import utils from '../../utils/dweller';

class DwellerController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const dwellers = await Dweller.findAll({
      attributes: [
        'id',
        'name',
        'email',
        'birthday',
        'cpf',
        'phone',
        'responsible',
      ],
      include: [
        {
          model: Apartment,
          as: 'apartment',
          attributes: ['id', 'identifier'],
        },
      ],
      limit: 20,
      order: ['name'],
      offset: (page - 1) * 20,
      where: utils.filters(req),
    });

    return res.json(dwellers);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string().required(),
      birthday: Yup.date(),
      cpf: Yup.string().required(),
      phone: Yup.string().required(),
      email: Yup.string().email().required(),
      apartment_id: Yup.number(),
      responsible: Yup.bool(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Verifique os campos' });
    }

    if (!validateCpf(req.body.cpf)) {
      return res.status(400).json({ error: 'CPF inválido.' });
    }

    if (await utils.emailExists(req)) {
      return res.status(400).json({ error: 'Email já esta em uso.' });
    }

    const {
      id,
      name,
      birthday,
      email,
      cpf,
      phone,
      reponsible,
      apartment_id,
    } = await Dweller.create({
      ...req.body,
      responsible: (await utils.firstResponsible(req)) || req.body.responsible,
    });

    return res.json({
      id,
      name,
      birthday,
      email,
      cpf,
      phone,
      reponsible,
      apartment_id,
    });
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string(),
      birthday: Yup.date(),
      cpf: Yup.string(),
      phone: Yup.string(),
      email: Yup.string(),
      apartment_id: Yup.number(),
      responsible: Yup.bool(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Verifique os campos' });
    }

    if (req.body.responsible === false) {
      return res
        .status(400)
        .json({ error: 'Necessário indicar um novo responsável' });
    }

    if (req.body.cpf && !validateCpf(req.body.cpf)) {
      return res.status(400).json({ error: 'CPF inválido.' });
    }

    if (req.body.email && (await utils.emailExists(req))) {
      return res.status(400).json({ error: 'Email já esta em uso.' });
    }

    const { id } = req.params;

    const dweller = await Dweller.findByPk(id);
    await dweller.update(req.body);

    return res.json(dweller);
  }

  async delete(req, res) {
    const { id } = req.params;
    const dweller = await Dweller.findByPk(id);
    if (dweller.responsible) {
      return res
        .status(400)
        .json({ error: 'Usuário é o responsável pelo Apartamento' });
    }
    const deleted = await Dweller.destroy({ where: { id } });

    return res.json({ deleted });
  }

  async findAll(req, res) {
    const dwellers = await Dweller.findAll({
      attributes: [
        ['id', 'value'],
        ['name', 'label'],
      ],
      order: ['name'],
      where: { apartment_id: null },
    });
    return res.json(dwellers);
  }
}

export default new DwellerController();
