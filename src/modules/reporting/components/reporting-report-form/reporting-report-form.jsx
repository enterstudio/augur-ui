/* eslint jsx-a11y/label-has-for: 0 */

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import { BINARY, CATEGORICAL, SCALAR } from 'modules/markets/constants/market-types'

import FormStyles from 'modules/common/less/form'
import Styles from 'modules/reporting/components/reporting-report-form/reporting-report-form.styles'
import { ExclamationCircle as InputErrorIcon } from 'modules/common/components/icons/icons'
import BigNumber from 'bignumber.js'

export default class ReportingReportForm extends Component {

  static propTypes = {
    market: PropTypes.object.isRequired,
    updateState: PropTypes.func.isRequired,
    validations: PropTypes.object.isRequired,
    selectedOutcome: PropTypes.string.isRequired,
    stake: PropTypes.string.isRequired,
    displayStakeOnly: PropTypes.bool.isRequired,
    isOpenReporting: PropTypes.bool.isRequired,
    isMarketInValid: PropTypes.bool,
  }

  constructor(props) {
    super(props)

    this.state = {
      outcomes: []
    }

    this.state.outcomes = this.props.market ? this.props.market.outcomes.slice() : []
    if (this.props.market && this.props.market.marketType === BINARY && this.props.market.outcomes.length === 1) {
      this.state.outcomes.push({ id: 0, name: 'No' })
    }
    this.state.outcomes.sort((a, b) => a.name - b.name)
  }

  validateOutcome(validations, selectedOutcome, selectedOutcomeName, isMarketInValid) {
    const updatedValidations = { ...validations }
    updatedValidations.selectedOutcome = true

    this.props.updateState({
      validations: updatedValidations,
      selectedOutcome,
      selectedOutcomeName,
      isMarketInValid,
    })
  }

  validateNumber(validations, fieldName, value, humanName, min, max) {
    const updatedValidations = { ...validations }

    const minValue = parseFloat(min)
    const maxValue = parseFloat(max)
    const valueValue = parseFloat(value)

    switch (true) {
      case value === '':
        updatedValidations[fieldName] = `The ${humanName} field is required.`
        break
      case (valueValue > maxValue || valueValue < minValue):
        updatedValidations[fieldName] = `Please enter a ${humanName} between ${min} and ${max}.`
        break
      default:
        updatedValidations[fieldName] = true
        updatedValidations.selectedOutcome = true
        break
    }

    this.props.updateState({
      validations: updatedValidations,
      selectedOutcome: value,
      selectedOutcomeName: value,
      isMarketInValid: false,
    })
  }

  validateStake(validations, rawStake) {
    const updatedValidations = { ...validations }
    const minStake = new BigNumber(0)
    let stake = rawStake
    if (stake !== '' && !(stake instanceof BigNumber)) {
      stake = new BigNumber(rawStake)
      stake = stake.round(4)
      switch (true) {
        case stake === '':
          updatedValidations.stake = `The stake field is required.`
          break
        case stake.lte(minStake):
          updatedValidations.stake = `Please enter a stake greater than 0.`
          break
        default:
          updatedValidations.stake = true
          break
      }

      this.props.updateState({
        validations: updatedValidations,
        stake
      })
    }
  }


  render() {
    const p = this.props
    const s = this.state

    return (
      <ul className={classNames(Styles.ReportingReportForm__fields, FormStyles.Form__fields)}>
        <li>
          <label>
            <span>Outcome</span>
          </label>
          { p.validations.hasOwnProperty('selectedOutcome') && p.validations.selectedOutcome.length &&
            <span className={FormStyles.Form__error}>
              {InputErrorIcon}{ p.validations.selectedOutcome }
            </span>
          }
        </li>
        { (p.market.marketType === BINARY || p.market.marketType === CATEGORICAL) &&
          <li>
            <ul className={FormStyles['Form__radio-buttons--per-line']}>
              { s.outcomes.map(outcome => (
                <li key={outcome.id}>
                  <button
                    className={classNames({ [`${FormStyles.active}`]: p.selectedOutcome === outcome.id })}
                    onClick={(e) => { this.validateOutcome(p.validations, outcome.id, outcome.name, false) }}
                  >{outcome.name}
                  </button>
                </li>
              ))
              }
              <li className={FormStyles['Form__radio-buttons--per-line']}>
                <button
                  className={classNames({ [`${FormStyles.active}`]: p.isMarketInValid === true })}
                  onClick={(e) => { this.validateOutcome(p.validations, '-1', '', true) }}
                >Market is invalid
                </button>
              </li>
            </ul>
          </li>
        }
        { p.market.marketType === SCALAR &&
          <li className={FormStyles['field--short']}>
            <ul className={FormStyles['Form__radio-buttons--per-line']}>
              <li>
                <button
                  className={classNames({ [`${FormStyles.active}`]: p.selectedOutcome !== '' })}
                  onClick={(e) => { this.validateOutcome(p.validations, 0, 'selectedOutcome', false) }}
                />
                <input
                  id="sr__input--outcome-scalar"
                  type="number"
                  min={p.market.minPrice}
                  max={p.market.maxPrice}
                  placeholder={p.market.minPrice}
                  value={p.selectedOutcome}
                  className={classNames({ [`${FormStyles['Form__error--field']}`]: p.validations.hasOwnProperty('selectedOutcome') && p.validations.selectedOutcome.length })}
                  onChange={(e) => { this.validateNumber(p.validations, 'selectedOutcome', e.target.value, 'outcome', p.market.minPrice, p.market.maxPrice) }}
                />
              </li>
              <li className={FormStyles['Form__radio-buttons--per-line']}>
                <button
                  className={classNames({ [`${FormStyles.active}`]: p.isMarketInValid === true })}
                  onClick={(e) => { this.validateOutcome(p.validations, '-1', '', true) }}
                >Market is invalid
                </button>
              </li>
            </ul>
          </li>
        }
        { !p.isOpenReporting &&
        <li>
          <ul>
            <li className={Styles.ReportingReport__RepLabel}>
              <label>
                <span htmlFor="sr__input--stake">Required Stake</span>
                { p.validations.hasOwnProperty('stake') && p.validations.stake.length &&
                  <span className={FormStyles.Form__error}>
                    { p.validations.stake }
                  </span>
                }
              </label>
            </li>
            <li className={Styles.ReportingReport__RepAmount}>
              <span>{p.stake} REP</span>
            </li>
          </ul>
        </li>
        }
        { !p.displayStakeOnly &&
        <li>
          <ul>
            <li className={FormStyles['field--short']}>
              <label>
                <span htmlFor="sr__input--stake">Stake</span>
                { p.validations.hasOwnProperty('stake') && p.validations.stake.length &&
                  <span className={FormStyles.Form__error}>
                    {InputErrorIcon}{ p.validations.stake }
                  </span>
                }
              </label>
            </li>
            <li>
              <input
                id="sr__input--stake"
                type="number"
                min="0"
                placeholder="0.0000 REP"
                value={p.stake instanceof BigNumber ? p.stake.toNumber() : p.stake}
                onChange={(e) => { this.validateStake(p.validations, e.target.value) }}
              />
            </li>
          </ul>
        </li>
        }
      </ul>
    )
  }
}
