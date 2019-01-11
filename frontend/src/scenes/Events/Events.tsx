import * as React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';

import {
  AppState,
} from 'store';

import {
  AuthStatus,
} from 'models';

import { EventsProps } from './Events.model';

import './Events.scss';

export class CaEventsPageComponent extends React.Component<EventsProps> {

  public componentWillMount(): void {
    const isAuthenticated = this.props.authStatus === AuthStatus.Authorized;

    if (!isAuthenticated) {
      this.props.history.push('/login');
    }
  }

  public render(): JSX.Element {
    return (
      <div className='ca-about'>
        {this.props.children}
        <div className="ca-about_board">
        <div className="ca-about_card">
          <button className="ca-about_card_edit-btn">Edit</button>
          <button className="ca-about_card_delete-btn">+</button>
          <div className="ca-about_card_img">
            <button className="ca-about_card_img_btn">JOIN US</button>
          </div>
          <div className="ca-about_card_information">
            <div className="ca-about_card_information_date">
              <div className="ca-about_card_information_date_month">
                May
              </div>
              <div className="ca-about_card_information_date_num">
                19
              </div>
            </div>
            <div className="ca-about_card_information_text">
              <div className="ca-about_card_information_text_title">
                ISTQB® Foundation Training Course for your Testing team - Mogilev
              </div>
              <div className="ca-about_card_information_text_time-address">
                <div className="ca-about_card_information_text_time">
                  Mon, 19 May, 19:00
                </div>
                <div className="ca-about_card_information_text_address">
                  г. Могилев, Косманавтов 19
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  authStatus: state.auth.status
});

const mapDispatchToProps = (dispatch: Dispatch) => ({});

export const CaEvents = connect(
  mapStateToProps,
  mapDispatchToProps
)(CaEventsPageComponent);
