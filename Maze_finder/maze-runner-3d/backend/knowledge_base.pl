% knowledge_base.pl
% Maze Runner 3D Knowledge Base

:- dynamic path/2.
:- dynamic wall/2.
:- dynamic griever_at/2.
:- dynamic player_at/2.

% --- Rules for Safe Zone ---
% The safe zone is defined as the inner 7x7 core (assuming 21x21 maze)
is_safe(R, C) :- 
    R >= 7, R =< 13, 
    C >= 7, C =< 13.

% --- Rules for Griever Perception ---
% A griever can "sense" a player if they are within 5 units of distance (Manhattan)
can_sense(GR, GC, PR, PC) :-
    Dist is abs(GR - PR) + abs(GC - PC),
    Dist =< 5.

% --- State Transition Logic ---
% Should the griever be in CHASE state?
should_chase(GR, GC, PR, PC, is_night) :-
    is_night == true,           % It must be night
    \+ is_safe(PR, PC),         % Player must not be in safe zone
    can_sense(GR, GC, PR, PC).  % Griever must sense player

% Should the griever be in ALERT state?
should_alert(is_night) :-
    is_night == true.

% Default state is DORMANT (Day time)
is_dormant(is_night) :-
    is_night == false.

% --- Navigation logic ---
% Check if a cell is a valid path
is_traversable(R, C) :-
    path(R, C),
    \+ wall(R, C).
